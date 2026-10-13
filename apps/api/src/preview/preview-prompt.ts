import { DEFAULT_PREVIEW_PROMPT } from '@vidntec/shared';

export interface PreviewReferenceLike {
  url: string;
  letters: string[];
  position: number;
}

/**
 * The reference photo for an initial: one that lists it explicitly wins, else a
 * default (no letters), else the first photo. null only when there are none.
 */
export function pickReference<T extends PreviewReferenceLike>(
  references: T[],
  initial: string,
): T | null {
  const ordered = [...references].sort((a, b) => a.position - b.position);
  return (
    ordered.find((r) => r.letters.includes(initial)) ??
    ordered.find((r) => r.letters.length === 0) ??
    ordered[0] ??
    null
  );
}

/** "Purple (#9b7fd1)" — or, with no variant colour set, tell the model to keep the photo's colour. */
export function colourPhrase(variantName: string, hex: string | null): string {
  if (!hex) return 'the same colour as in the reference photo';
  const label = variantName.trim();
  return label ? `${label} (${hex})` : hex;
}

/** Fill the {name} / {initial} / {colour} blanks. Function replacers so `$` in a name is never special. */
export function buildPreviewPrompt(
  template: string,
  values: { name: string; initial: string; colour: string },
): string {
  const base = template.trim() || DEFAULT_PREVIEW_PROMPT;
  return base
    .replaceAll('{name}', () => values.name)
    .replaceAll('{initial}', () => values.initial)
    .replaceAll('{colour}', () => values.colour);
}

/**
 * Ask Cloudinary for a PNG capped at 1280px — keeps the upload to the image
 * model small and normalises odd formats (HEIC/WebP). Non-Cloudinary-shaped
 * URLs are returned unchanged.
 */
export function referenceFetchUrl(url: string): string {
  return url.includes('/image/upload/')
    ? url.replace('/image/upload/', '/image/upload/w_1280,c_limit,f_png/')
    : url;
}
