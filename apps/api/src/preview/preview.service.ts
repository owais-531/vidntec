import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { toFile } from 'openai';
import type OpenAI from 'openai';
import {
  nameInitial,
  PREVIEW_GLOBAL_DAILY_CAP,
  type PreviewRequest,
  type PreviewResponse,
  type PreviewTestRequest,
} from '@vidntec/shared';
import type { Prisma } from '@vidntec/shared/prisma';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { toPersonalizationFields } from '../products/products.mapper';
import { createOpenAiClient } from '../chat/openai-client';
import {
  buildPreviewPrompt,
  colourPhrase,
  pickReference,
  referenceFetchUrl,
} from './preview-prompt';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const IMAGE_SIZE = '1024x1536' as const;
const REQUEST_TIMEOUT_MS = 120_000;
const REFERENCE_TIMEOUT_MS = 15_000;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;

type PreviewProduct = Prisma.ProductGetPayload<{
  include: { variants: true; previewReferences: true };
}>;

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.client = createOpenAiClient(config.get('OPENAI_API_KEY', { infer: true }));
    this.model = config.get('OPENAI_IMAGE_MODEL', { infer: true }) ?? 'gpt-image-1.5';
  }

  /** Customer-facing: active product with previews switched on, per-visitor + global caps. */
  async generateForStorefront(slug: string, input: PreviewRequest): Promise<PreviewResponse> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'active' },
      include: { variants: true, previewReferences: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.previewEnabled) {
      throw new BadRequestException('Preview is not available for this product');
    }
    return this.run(product, input.variantId, input.name, input.visitorKey, {
      initial: input.initial,
      colourChoice: input.colourChoice,
    });
  }

  /** Admin "Test" box: any product (even a draft, even with previews off), no quota. */
  async generateForAdmin(productId: string, input: PreviewTestRequest): Promise<PreviewResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true, previewReferences: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.run(product, input.variantId, input.name, null);
  }

  private async run(
    product: PreviewProduct,
    variantId: string,
    name: string,
    visitorKey: string | null,
    extras: { initial?: string; colourChoice?: string } = {},
  ): Promise<PreviewResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException('Preview is not set up yet — try again later.');
    }
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw new BadRequestException('Selected option does not belong to this product');

    const initial = this.initialFor(product, name, extras.initial);
    const reference = pickReference(product.previewReferences, initial);
    if (!reference) {
      throw new ServiceUnavailableException('Preview is not set up for this product yet.');
    }

    const quota = visitorKey ? await this.claimQuota(product, visitorKey) : null;
    try {
      const image = await this.fetchReference(reference.url);
      const prompt = buildPreviewPrompt(product.previewPrompt, {
        name,
        initial,
        colour: this.colourFor(product, variant, extras.colourChoice),
      });
      const imageDataUrl = await this.generate(image, prompt);
      return { imageDataUrl, remaining: quota ? quota.remaining : null };
    } catch (err) {
      // A failed generation must not use up the customer's quota.
      if (quota) await this.prisma.previewGeneration.delete({ where: { id: quota.id } }).catch(() => undefined);
      throw err;
    }
  }

  /**
   * The initial the prompt and reference photo use: the customer's answer in the
   * product's mapped "initial" field when it has one and they gave a letter,
   * else the first letter of the name.
   */
  private initialFor(product: PreviewProduct, name: string, given?: string): string {
    if (product.previewInitialFieldId && given && /^\p{L}/u.test(given.trim())) {
      return nameInitial(given);
    }
    return nameInitial(name);
  }

  /**
   * The colour the prompt paints in: the swatch of the customer's pick in the
   * product's mapped colour field (hex always from the product's own choices,
   * never the client), else the selected variant's colour.
   */
  private colourFor(
    product: PreviewProduct,
    variant: { name: string; colorHex: string | null },
    choice?: string,
  ): string {
    if (product.previewColourFieldId && choice) {
      const field = toPersonalizationFields(product.personalizationFields).find(
        (f) => f.id === product.previewColourFieldId,
      );
      const picked = field?.type === 'dropdown' ? field.choices.find((c) => c.label === choice) : undefined;
      if (picked?.hex) return colourPhrase(picked.label, picked.hex);
    }
    return colourPhrase(variant.name, variant.colorHex);
  }

  /**
   * Insert-then-count: the row is written first so two parallel requests can't
   * both squeeze under the cap; whoever lands over it removes their own row.
   */
  private async claimQuota(
    product: PreviewProduct,
    visitorKey: string,
  ): Promise<{ id: string; remaining: number }> {
    const row = await this.prisma.previewGeneration.create({
      data: { productId: product.id, visitorKey },
    });
    const since = new Date(Date.now() - WINDOW_MS);
    const [mine, all] = await Promise.all([
      this.prisma.previewGeneration.count({
        where: { productId: product.id, visitorKey, createdAt: { gte: since } },
      }),
      this.prisma.previewGeneration.count({ where: { createdAt: { gte: since } } }),
    ]);

    if (mine > product.previewLimit) {
      await this.prisma.previewGeneration.delete({ where: { id: row.id } });
      throw new HttpException(
        `You've used all ${product.previewLimit} previews for this product today. ` +
          `You can still add it to your cart, or message us on WhatsApp.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (all > PREVIEW_GLOBAL_DAILY_CAP) {
      await this.prisma.previewGeneration.delete({ where: { id: row.id } });
      this.logger.warn(`Global preview cap (${PREVIEW_GLOBAL_DAILY_CAP}/24h) reached`);
      throw new ServiceUnavailableException(
        'Previews are very busy right now — please try again later.',
      );
    }
    return { id: row.id, remaining: Math.max(0, product.previewLimit - mine) };
  }

  private async fetchReference(url: string): Promise<{ buffer: Buffer; type: string }> {
    let res: Response;
    try {
      res = await fetch(referenceFetchUrl(url), { signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS) });
    } catch (err) {
      this.logger.error(`Reference photo fetch failed: ${String(err)}`);
      throw new BadGatewayException('Could not load the reference photo — please try again.');
    }
    if (!res.ok) {
      this.logger.error(`Reference photo fetch returned ${res.status}`);
      throw new BadGatewayException('Could not load the reference photo — please try again.');
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_REFERENCE_BYTES) {
      throw new BadGatewayException('The reference photo is too large.');
    }
    const type = res.headers.get('content-type')?.split(';')[0] ?? 'image/png';
    return { buffer, type: type.startsWith('image/') ? type : 'image/png' };
  }

  private async generate(
    reference: { buffer: Buffer; type: string },
    prompt: string,
  ): Promise<string> {
    try {
      const res = await this.client!.images.edit(
        {
          model: this.model,
          image: await toFile(reference.buffer, 'reference', { type: reference.type }),
          prompt,
          size: IMAGE_SIZE,
          quality: 'medium',
          output_format: 'jpeg',
          output_compression: 85,
          n: 1,
        },
        // No SDK retries: each attempt is billed, and a timeout may still have been charged.
        { timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 },
      );
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error('image API returned no image');
      return `data:image/jpeg;base64,${b64}`;
    } catch (err) {
      if ((err as { code?: string }).code === 'moderation_blocked') {
        throw new UnprocessableEntityException(
          "We couldn't create a preview for that name. Please check the spelling or try another.",
        );
      }
      this.logger.error(`OpenAI image preview failed: ${String(err)}`);
      Sentry.captureException(err);
      throw new BadGatewayException('The preview service failed to respond — please try again.');
    }
  }
}
