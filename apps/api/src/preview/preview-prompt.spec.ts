import { describe, expect, it } from 'vitest';
import { DEFAULT_PREVIEW_PROMPT } from '@vidntec/shared';
import {
  buildPreviewPrompt,
  colourPhrase,
  pickReference,
  referenceFetchUrl,
} from './preview-prompt';

const ref = (id: string, letters: string[], position = 0) => ({
  id,
  url: `https://res.cloudinary.com/x/image/upload/v1/${id}.jpg`,
  letters,
  position,
});

describe('pickReference', () => {
  const refs = [ref('default', [], 0), ref('A', ['A'], 1), ref('VW', ['V', 'W'], 2)];

  it('prefers a photo that lists the initial', () => {
    expect(pickReference(refs, 'A')?.id).toBe('A');
    expect(pickReference(refs, 'W')?.id).toBe('VW');
  });

  it('falls back to the default (no letters) photo', () => {
    expect(pickReference(refs, 'Z')?.id).toBe('default');
  });

  it('falls back to the first photo when none is a default', () => {
    expect(pickReference([ref('A', ['A'], 3), ref('B', ['B'], 1)], 'Z')?.id).toBe('B');
  });

  it('returns null when there are no photos', () => {
    expect(pickReference([], 'A')).toBeNull();
  });
});

describe('buildPreviewPrompt', () => {
  const values = { name: 'Ayesha', initial: 'A', colour: 'Purple (#9b7fd1)' };

  it('fills every blank, including repeats', () => {
    const out = buildPreviewPrompt('{name} / {initial} / {colour} / {name}', values);
    expect(out).toBe('Ayesha / A / Purple (#9b7fd1) / Ayesha');
  });

  it('uses the shared default prompt when the product has none', () => {
    const out = buildPreviewPrompt('   ', values);
    expect(out).toContain('"Ayesha"');
    expect(out).not.toContain('{name}');
    expect(DEFAULT_PREVIEW_PROMPT).toContain('{name}');
  });

  it('never treats "$" in a name as a replacement pattern', () => {
    expect(buildPreviewPrompt('{name}', { ...values, name: "O$&Brien" })).toBe('O$&Brien');
  });
});

describe('colourPhrase', () => {
  it('combines the variant name and hex', () => {
    expect(colourPhrase('Purple', '#9b7fd1')).toBe('Purple (#9b7fd1)');
  });
  it('uses just the hex when the variant name is blank', () => {
    expect(colourPhrase('  ', '#9b7fd1')).toBe('#9b7fd1');
  });
  it('tells the model to keep the photo colour when none is set', () => {
    expect(colourPhrase('Purple', null)).toContain('reference photo');
  });
});

describe('referenceFetchUrl', () => {
  it('asks Cloudinary for a capped PNG', () => {
    expect(referenceFetchUrl('https://res.cloudinary.com/c/image/upload/v1/a.jpg')).toBe(
      'https://res.cloudinary.com/c/image/upload/w_1280,c_limit,f_png/v1/a.jpg',
    );
  });
  it('leaves other URLs alone', () => {
    expect(referenceFetchUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
});
