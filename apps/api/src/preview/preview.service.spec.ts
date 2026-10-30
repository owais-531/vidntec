import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PREVIEW_GLOBAL_DAILY_CAP } from '@vidntec/shared';
import { PreviewService } from './preview.service';

const REAL_KEY = 'sk-realtestkey1234567890abcdef';
const VISITOR = 'visitor-key-0123456789';

const variant = { id: 'v1', name: 'Purple', colorHex: '#9b7fd1' };
const reference = (id: string, letters: string[], position = 0) => ({
  id,
  url: `https://res.cloudinary.com/x/image/upload/v1/${id}.jpg`,
  letters,
  position,
});
const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'frame',
  status: 'active',
  previewEnabled: true,
  previewPrompt: 'Draw "{name}" with initial {initial} in {colour}',
  personalizationFields: [
    { id: 'c', type: 'dropdown', label: 'Colour', required: true, choices: [{ label: 'Red', hex: '#ff0000' }, { label: 'Matte' }] },
  ],
  previewLimit: 3,
  variants: [variant],
  previewReferences: [reference('default', []), reference('A', ['A'], 1)],
  ...over,
});

function make(opts: { key?: string; product?: unknown; mine?: number; all?: number } = {}) {
  const prisma = {
    product: {
      findFirst: vi.fn().mockResolvedValue(opts.product === undefined ? product() : opts.product),
      findUnique: vi.fn().mockResolvedValue(opts.product === undefined ? product() : opts.product),
    },
    previewGeneration: {
      create: vi.fn().mockResolvedValue({ id: 'gen1' }),
      delete: vi.fn().mockResolvedValue({}),
      count: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { visitorKey?: string } }) =>
          where.visitorKey ? (opts.mine ?? 1) : (opts.all ?? 1),
        ),
    },
  };
  const config = {
    get: vi.fn((k: string) => (k === 'OPENAI_API_KEY' ? (opts.key ?? REAL_KEY) : 'gpt-image-1.5')),
  } as unknown as ConfigService;
  const service = new PreviewService(prisma as never, config as never);
  const edit = vi.fn().mockResolvedValue({ data: [{ b64_json: 'QUJD' }] });
  (service as unknown as { client: unknown }).client = { images: { edit } };
  return { service, prisma, edit };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode('png-bytes').buffer,
    headers: { get: () => 'image/png' },
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const input = { variantId: 'v1', name: 'Ayesha', visitorKey: VISITOR };

describe('PreviewService.generateForStorefront', () => {
  it('returns a jpeg data URL and the remaining count', async () => {
    const { service } = make({ mine: 1 });
    await expect(service.generateForStorefront('frame', input)).resolves.toEqual({
      imageDataUrl: 'data:image/jpeg;base64,QUJD',
      remaining: 2,
    });
  });

  it('builds the prompt from the product template, variant colour and initial', async () => {
    const { service, edit } = make();
    await service.generateForStorefront('frame', input);
    expect(edit.mock.calls[0][0].prompt).toBe('Draw "Ayesha" with initial A in Purple (#9b7fd1)');
  });

  it('uses the reference photo registered for the initial, else the default', async () => {
    const a = make();
    await a.service.generateForStorefront('frame', input);
    expect(fetchMock.mock.calls[0][0]).toContain('/A.jpg');

    fetchMock.mockClear();
    const z = make();
    await z.service.generateForStorefront('frame', { ...input, name: 'Zoya' });
    expect(fetchMock.mock.calls[0][0]).toContain('/default.jpg');
  });

  it('404s an unknown or inactive product', async () => {
    const { service } = make({ product: null });
    await expect(service.generateForStorefront('nope', input)).rejects.toThrow('Product not found');
  });

  it('refuses when the preview is switched off for the product', async () => {
    const { service, edit } = make({ product: product({ previewEnabled: false }) });
    await expect(service.generateForStorefront('frame', input)).rejects.toThrow('not available');
    expect(edit).not.toHaveBeenCalled();
  });

  it('refuses a variant from another product', async () => {
    const { service } = make();
    await expect(
      service.generateForStorefront('frame', { ...input, variantId: 'other' }),
    ).rejects.toThrow('does not belong');
  });

  it('503s when the product has no reference photos', async () => {
    const { service } = make({ product: product({ previewReferences: [] }) });
    await expect(service.generateForStorefront('frame', input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('503s when the OpenAI key is a placeholder', async () => {
    const { service } = make({ key: 'abc' });
    (service as unknown as { client: unknown }).client = null;
    await expect(service.generateForStorefront('frame', input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('429s over the per-visitor limit, removes its own row and never calls the image API', async () => {
    const { service, prisma, edit } = make({ mine: 4 }); // limit is 3, this would be the 4th
    const err = await service.generateForStorefront('frame', input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect(prisma.previewGeneration.delete).toHaveBeenCalledWith({ where: { id: 'gen1' } });
    expect(edit).not.toHaveBeenCalled();
  });

  it('allows exactly the limit', async () => {
    const { service } = make({ mine: 3 });
    await expect(service.generateForStorefront('frame', input)).resolves.toMatchObject({
      remaining: 0,
    });
  });

  it('503s over the global daily cap', async () => {
    const { service, prisma, edit } = make({ all: PREVIEW_GLOBAL_DAILY_CAP + 1 });
    await expect(service.generateForStorefront('frame', input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.previewGeneration.delete).toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('refunds the quota when the image API fails', async () => {
    const { service, prisma, edit } = make();
    edit.mockRejectedValueOnce(new Error('boom'));
    await expect(service.generateForStorefront('frame', input)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.previewGeneration.delete).toHaveBeenCalledWith({ where: { id: 'gen1' } });
  });

  it('maps a moderation block to a 422 with a friendly message', async () => {
    const { service, edit } = make();
    edit.mockRejectedValueOnce(Object.assign(new Error('blocked'), { code: 'moderation_blocked' }));
    const err = await service.generateForStorefront('frame', input).catch((e: unknown) => e);
    expect((err as HttpException).getStatus()).toBe(422);
  });

  it('refunds the quota when the reference photo cannot be loaded', async () => {
    const { service, prisma } = make();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(service.generateForStorefront('frame', input)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.previewGeneration.delete).toHaveBeenCalled();
  });
});

describe('PreviewService.generateForAdmin', () => {
  it('works on a draft with the preview off, and neither claims nor reports a quota', async () => {
    const { service, prisma } = make({ product: product({ status: 'draft', previewEnabled: false }) });
    await expect(service.generateForAdmin('p1', { variantId: 'v1', name: 'Ali' })).resolves.toEqual({
      imageDataUrl: 'data:image/jpeg;base64,QUJD',
      remaining: null,
    });
    expect(prisma.previewGeneration.create).not.toHaveBeenCalled();
  });
});

describe('PreviewService field mapping', () => {
  const promptOf = (edit: { mock: { calls: unknown[][] } }) =>
    (edit.mock.calls[0]![0] as { prompt: string }).prompt;

  it('uses the mapped initial field when the customer gave a letter', async () => {
    const { service, edit } = make({ product: product({ previewInitialFieldId: 'i' }) });
    await service.generateForStorefront('frame', { ...input, name: 'Ayesha', initial: 'z' });
    expect(promptOf(edit)).toContain('initial Z');
  });

  it('ignores a client initial when the product has no initial field, or it is not a letter', async () => {
    const a = make();
    await a.service.generateForStorefront('frame', { ...input, initial: 'Z' });
    expect(promptOf(a.edit)).toContain('initial A');
    const b = make({ product: product({ previewInitialFieldId: 'i' }) });
    await b.service.generateForStorefront('frame', { ...input, initial: '7' });
    expect(promptOf(b.edit)).toContain('initial A');
  });

  it("paints the mapped colour field's swatch, taken from the product's own choices", async () => {
    const { service, edit } = make({ product: product({ previewColourFieldId: 'c' }) });
    await service.generateForStorefront('frame', { ...input, colourChoice: 'Red' });
    expect(promptOf(edit)).toContain('Red (#ff0000)');
  });

  it('falls back to the variant colour for an unknown choice, a choice without a swatch, or no mapping', async () => {
    for (const [mapped, choice] of [['c', 'Hacked'], ['c', 'Matte'], [null, 'Red']] as const) {
      const { service, edit } = make({ product: product({ previewColourFieldId: mapped }) });
      await service.generateForStorefront('frame', { ...input, colourChoice: choice });
      expect(promptOf(edit)).toContain('Purple (#9b7fd1)');
    }
  });
});
