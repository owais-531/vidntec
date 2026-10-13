import { z } from 'zod';
import {
  CUSTOMIZATION_NAME_MAX_LENGTH,
  PREVIEW_NAME_PATTERN,
} from '../constants';

/** What a customer may type into a previewable name field. */
export const previewNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a name')
  .max(CUSTOMIZATION_NAME_MAX_LENGTH)
  .regex(PREVIEW_NAME_PATTERN, 'Use letters only — spaces, apostrophes and hyphens are fine');

/** Storefront: generate a preview. `visitorKey` is an opaque id the web app keeps in a cookie. */
export const previewRequestSchema = z.object({
  variantId: z.string().cuid(),
  name: previewNameSchema,
  visitorKey: z.string().min(16).max(64),
});
export type PreviewRequest = z.infer<typeof previewRequestSchema>;

/** Admin test run — same inputs, no visitor and no quota. */
export const previewTestRequestSchema = z.object({
  variantId: z.string().cuid(),
  name: previewNameSchema,
});
export type PreviewTestRequest = z.infer<typeof previewTestRequestSchema>;

export const previewResponseSchema = z.object({
  /** `data:image/jpeg;base64,…` — shown once, never stored. */
  imageDataUrl: z.string(),
  /** Previews this visitor has left for this product today; null for admin tests. */
  remaining: z.number().int().nullable(),
});
export type PreviewResponse = z.infer<typeof previewResponseSchema>;

// ── admin: reference photos ─────────────────────────────────────────────────

/** Initials a reference photo applies to, e.g. ["A"]. Empty = the default photo. */
export const previewLettersSchema = z
  .array(z.string().regex(/^[A-Z]$/, 'single letters A–Z only'))
  .max(26);

/** Only Cloudinary-hosted photos — the API fetches these server-side. */
const cloudinaryUrlSchema = z
  .string()
  .url()
  .regex(/^https:\/\/res\.cloudinary\.com\//, 'must be an uploaded Cloudinary image');

export const attachPreviewReferenceSchema = z.object({
  url: cloudinaryUrlSchema,
  publicId: z.string().min(1).max(300),
  letters: previewLettersSchema.default([]),
});
export type AttachPreviewReferenceInput = z.infer<typeof attachPreviewReferenceSchema>;

export const updatePreviewReferenceSchema = z.object({
  letters: previewLettersSchema,
});
export type UpdatePreviewReferenceInput = z.infer<typeof updatePreviewReferenceSchema>;

export const adminPreviewReferenceSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  letters: z.array(z.string()),
  position: z.number().int(),
});
export type AdminPreviewReference = z.infer<typeof adminPreviewReferenceSchema>;

/** "a, b  c" → ["A","B","C"]: keeps A–Z only, uppercased, deduped, in order. */
export function parsePreviewLetters(input: string): string[] {
  const seen = new Set<string>();
  for (const ch of input.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') seen.add(ch);
  }
  return [...seen];
}

/** Upper-cased first letter of a name — the "initial" the prompt and reference choice use. */
export function nameInitial(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toLocaleUpperCase('en') : '';
}
