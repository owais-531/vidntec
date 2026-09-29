import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import sanitizeHtml from 'sanitize-html';
import type OpenAI from 'openai';
import type { ScopeDraftRequest } from '@vidntec/shared';
import type { Env } from '../config/env';
import { sanitizeDescription } from '../products/sanitize-description';
import { createOpenAiClient } from './openai-client';

const MODEL = 'gpt-4o-mini';
const MAX_SCOPE_TOKENS = 1500;

const SYSTEM_PROMPT = `You write the "Scope" section for product pages on VIDNTEC, a Pakistan-based store selling 3D-printed products, including engineered/functional parts and CAD design work.

The Scope section is the technical write-up: what the product or service is for, what it covers, its technical characteristics, what is included, and what is out of scope or limited.

Rules:
- Base everything ONLY on the product details provided. Never invent numbers, tolerances, load ratings, materials, dimensions, certifications, file formats, lead times or prices that are not in the input. If a useful fact is missing, describe it qualitatively or leave it out — do not guess.
- Clear, professional, technical tone. No marketing fluff, no emojis, no exclamation marks.
- Organise it as short sections. Each section starts with a bold label on its own line (e.g. <p><strong>Applications</strong></p>) followed by a short paragraph or a bullet list. Pick section labels that fit the product; typical ones are Overview, Applications, Technical details, What's included, Deliverables (for CAD/design work), Limitations.
- Output ONLY HTML using these tags and nothing else: <p>, <strong>, <em>, <u>, <ul>, <li>, <br>. No headings, no links, no attributes, no code fences, no commentary before or after.
- Keep it under about 350 words.`;

@Injectable()
export class ScopeWriterService {
  private readonly logger = new Logger(ScopeWriterService.name);
  private readonly client: OpenAI | null;

  constructor(config: ConfigService<Env, true>) {
    this.client = createOpenAiClient(config.get('OPENAI_API_KEY', { infer: true }));
  }

  async draft(input: ScopeDraftRequest): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI writing is not set up yet — a real OPENAI_API_KEY is needed on the API.',
      );
    }

    let raw: string;
    try {
      const res = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        max_tokens: MAX_SCOPE_TOKENS,
        temperature: 0.4,
      });
      raw = res.choices[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.error(`OpenAI scope draft failed: ${String(err)}`);
      Sentry.captureException(err);
      throw new BadGatewayException('The AI service failed to respond — please try again.');
    }

    // Models sometimes wrap output in ```html fences despite instructions.
    const unfenced = raw.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
    const scope = sanitizeDescription(unfenced);
    if (!scope) {
      throw new BadGatewayException('The AI returned an empty draft — please try again.');
    }
    return scope;
  }
}

/** Description arrives as editor HTML — flatten it to readable text for the prompt. */
function htmlToText(html: string): string {
  const withBreaks = html.replace(/<\/(p|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  return sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildUserPrompt(input: ScopeDraftRequest): string {
  const lines = [`Product title: ${input.title}`];
  if (input.categoryName) lines.push(`Category: ${input.categoryName}`);
  const description = htmlToText(input.description);
  if (description) lines.push(`Description:\n${description}`);
  if (input.specs.length) {
    lines.push(`Specifications:\n${input.specs.map((s) => `- ${s.label}: ${s.value}`).join('\n')}`);
  }
  const variants = input.variantNames.map((v) => v.trim()).filter(Boolean);
  if (variants.length) lines.push(`Variants / options: ${variants.join(', ')}`);
  if (input.instructions)
    lines.push(`Extra instructions from the store admin: ${input.instructions}`);
  return lines.join('\n\n');
}
