import { describe, expect, it, vi } from 'vitest';
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { scopeDraftRequestSchema } from '@vidntec/shared';
import { buildUserPrompt, ScopeWriterService } from './scope-writer.service';

const REAL_KEY = 'sk-realtestkey1234567890abcdef';

function make(key = REAL_KEY) {
  const config = { get: vi.fn(() => key) } as unknown as ConfigService;
  return new ScopeWriterService(config as never);
}

/** Same private-field swap as chat.service.spec.ts — no DI seam for the SDK client. */
function withReply(service: ScopeWriterService, content: string) {
  const create = vi.fn().mockResolvedValue({ choices: [{ message: { content } }] });
  (service as unknown as { client: unknown }).client = { chat: { completions: { create } } };
  return create;
}

const input = scopeDraftRequestSchema.parse({
  title: 'Gear Housing',
  description: '<p>Enclosure for a <strong>12V</strong> motor.</p><ul><li>PETG</li></ul>',
  categoryName: 'Engineered Products',
  specs: [{ label: 'Wall thickness', value: '3 mm' }],
  variantNames: ['Black', ' '],
  instructions: 'mention heat resistance',
});

describe('ScopeWriterService', () => {
  it('refuses with 503 when the key is a placeholder', async () => {
    await expect(make('abc').draft(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('strips code fences and sanitizes the model output', async () => {
    const service = make();
    withReply(
      service,
      '```html\n<p><strong>Overview</strong></p><script>x</script><p onclick="y">Hi</p>\n```',
    );
    await expect(service.draft(input)).resolves.toBe('<p><strong>Overview</strong></p><p>Hi</p>');
  });

  it('rejects an empty draft', async () => {
    const service = make();
    withReply(service, '<p></p>');
    await expect(service.draft(input)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('maps an OpenAI failure to 502', async () => {
    const service = make();
    (service as unknown as { client: unknown }).client = {
      chat: { completions: { create: vi.fn().mockRejectedValue(new Error('boom')) } },
    };
    await expect(service.draft(input)).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('buildUserPrompt', () => {
  it('includes every product detail, flattening description HTML to text', () => {
    const prompt = buildUserPrompt(input);
    expect(prompt).toContain('Product title: Gear Housing');
    expect(prompt).toContain('Category: Engineered Products');
    expect(prompt).toContain('Enclosure for a 12V motor.\nPETG');
    expect(prompt).not.toContain('<');
    expect(prompt).toContain('- Wall thickness: 3 mm');
    expect(prompt).toContain('Variants / options: Black');
    expect(prompt).toContain('mention heat resistance');
  });
});
