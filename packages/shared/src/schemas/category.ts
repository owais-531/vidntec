import { z } from 'zod';
import { slugSchema } from './common';
import { CATEGORY_DEFAULT_COLOR } from '../constants';

/** 6-digit hex colour, normalised to lowercase. */
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour, e.g. #dce9e2')
  .transform((v) => v.toLowerCase());

/** Optional short icon shown on the storefront tile (an emoji, typically). */
const emojiSchema = z.string().trim().min(1).max(8);

// ── inputs (admin) ──────────────────────────────────────────────────────────

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  // optional — server slugifies the name when omitted
  slug: slugSchema.optional(),
  color: hexColorSchema.default(CATEGORY_DEFAULT_COLOR),
  emoji: emojiSchema.nullable().optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.partial();
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().cuid()).min(1),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

// ── DTOs ────────────────────────────────────────────────────────────────────

/** Admin list row — includes the assigned-product count for the delete warning. */
export const adminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string(),
  emoji: z.string().nullable(),
  position: z.number().int(),
  productCount: z.number().int(),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

/** Public tile — `productCount` counts only active products. */
export const publicCategorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  color: z.string(),
  emoji: z.string().nullable(),
  productCount: z.number().int(),
});
export type PublicCategory = z.infer<typeof publicCategorySchema>;

/** Category reference embedded in the public product DTO (PDP breadcrumb). */
export const publicProductCategorySchema = z.object({
  name: z.string(),
  slug: z.string(),
});
export type PublicProductCategory = z.infer<typeof publicProductCategorySchema>;
