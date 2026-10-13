import { describe, expect, it } from 'vitest';
import {
  attachPreviewReferenceSchema,
  createProductSchema,
  nameInitial,
  parsePreviewLetters,
  previewNameSchema,
  updateProductSchema,
} from './index';

describe('previewNameSchema', () => {
  it.each(['Ayesha', "O'Brien", 'Mary-Jane', 'Muhammad Abdullah', 'Zoë', 'عائشہ'])(
    'accepts %s',
    (name) => expect(previewNameSchema.safeParse(name).success).toBe(true),
  );

  it.each(['', '   ', '123', 'Ali<script>', 'A"B', 'x'.repeat(41), '-Ali', 'Ali\nBaba'])(
    'rejects %j',
    (name) => expect(previewNameSchema.safeParse(name).success).toBe(false),
  );

  it('trims surrounding whitespace', () => {
    expect(previewNameSchema.parse('  Ali ')).toBe('Ali');
  });
});

describe('nameInitial', () => {
  it('upper-cases the first letter', () => {
    expect(nameInitial('ayesha')).toBe('A');
    expect(nameInitial('  zoya')).toBe('Z');
    expect(nameInitial('')).toBe('');
  });
});

describe('parsePreviewLetters', () => {
  it('keeps A–Z only, uppercased, de-duplicated, in order', () => {
    expect(parsePreviewLetters('a, b  c; a 1 !')).toEqual(['A', 'B', 'C']);
    expect(parsePreviewLetters('')).toEqual([]);
  });
});

describe('attachPreviewReferenceSchema', () => {
  const ok = { url: 'https://res.cloudinary.com/c/image/upload/v1/a.jpg', publicId: 'a' };
  it('accepts a Cloudinary https URL and defaults letters to []', () => {
    expect(attachPreviewReferenceSchema.parse(ok).letters).toEqual([]);
  });
  it('rejects other hosts and plain http', () => {
    expect(attachPreviewReferenceSchema.safeParse({ ...ok, url: 'https://evil.com/a.jpg' }).success).toBe(false);
    expect(
      attachPreviewReferenceSchema.safeParse({ ...ok, url: 'http://res.cloudinary.com/a.jpg' }).success,
    ).toBe(false);
  });
  it('rejects lowercase or multi-character letters', () => {
    expect(attachPreviewReferenceSchema.safeParse({ ...ok, letters: ['a'] }).success).toBe(false);
    expect(attachPreviewReferenceSchema.safeParse({ ...ok, letters: ['AB'] }).success).toBe(false);
  });
});

describe('product preview fields', () => {
  const base = {
    title: 'Frame',
    variants: [{ name: 'Std', price: 1000, sku: 'F-1', stock: 1 }],
  };

  it('create: preview off by default, limit defaults to 5', () => {
    const p = createProductSchema.parse(base);
    expect(p).toMatchObject({ previewEnabled: false, previewPrompt: '', previewLimit: 5 });
  });

  it('create: preview needs name personalization', () => {
    expect(createProductSchema.safeParse({ ...base, previewEnabled: true }).success).toBe(false);
    expect(
      createProductSchema.safeParse({ ...base, previewEnabled: true, customizationNameEnabled: true })
        .success,
    ).toBe(true);
  });

  it('a custom prompt must contain {name}', () => {
    expect(updateProductSchema.safeParse({ previewPrompt: 'Draw a frame' }).success).toBe(false);
    expect(updateProductSchema.safeParse({ previewPrompt: 'Write "{name}"' }).success).toBe(true);
    expect(updateProductSchema.safeParse({ previewPrompt: '' }).success).toBe(true);
  });

  it('limit must be 1–20', () => {
    expect(updateProductSchema.safeParse({ previewLimit: 0 }).success).toBe(false);
    expect(updateProductSchema.safeParse({ previewLimit: 21 }).success).toBe(false);
    expect(updateProductSchema.safeParse({ previewLimit: 3 }).success).toBe(true);
  });

  it('variant colour must be a hex colour or null', () => {
    const v = (colorHex: unknown) =>
      createProductSchema.safeParse({ ...base, variants: [{ ...base.variants[0], colorHex }] }).success;
    expect(v('#9b7fd1')).toBe(true);
    expect(v(null)).toBe(true);
    expect(v('purple')).toBe(false);
  });
});
