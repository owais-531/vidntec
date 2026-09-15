import { z } from 'zod';
import { centsSchema, slugSchema } from './common';
import { publicProductCategorySchema } from './category';
import {
  CUSTOMIZATION_MAX_COLOR_OPTIONS,
  MEDIA_TYPES,
  PRODUCT_STATUSES,
} from '../constants';

export const mediaTypeSchema = z.enum(MEDIA_TYPES);

// ── inputs (admin) ──────────────────────────────────────────────────────────

export const variantInputSchema = z.object({
  name: z.string().min(1).max(120),
  price: centsSchema,
  /** Optional "was" price. On sale when it is set and greater than `price`. null clears it. */
  compareAtPrice: centsSchema.nullable().optional(),
  sku: z.string().min(1).max(64),
  stock: z.number().int().min(0),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export const variantUpdateSchema = variantInputSchema.partial();
export type VariantUpdate = z.infer<typeof variantUpdateSchema>;

/** Category assignment: a cuid to assign, `null` to clear, omitted to leave unchanged. */
const categoryIdSchema = z.string().cuid().nullable().optional();

/** One admin-defined color a customer can pick for a customizable product. */
export const customizationColorOptionSchema = z.object({
  label: z.string().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex color like #8a1a1c'),
});
export type CustomizationColorOption = z.infer<typeof customizationColorOptionSchema>;

export const customizationColorOptionsSchema = z
  .array(customizationColorOptionSchema)
  .max(CUSTOMIZATION_MAX_COLOR_OPTIONS);

/** Shared by create/update: color options are required once color customization is on. */
function requireColorOptionsWhenEnabled(
  data: { customizationColorEnabled?: boolean; customizationColorOptions?: unknown[] },
  ctx: z.RefinementCtx,
): void {
  if (data.customizationColorEnabled && !data.customizationColorOptions?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Add at least one color option',
      path: ['customizationColorOptions'],
    });
  }
}

export const createProductSchema = z
  .object({
    title: z.string().min(1).max(200),
    // optional — server slugifies the title when omitted
    slug: slugSchema.optional(),
    description: z.string().max(20_000).default(''),
    status: z.enum(PRODUCT_STATUSES).default('draft'),
    featured: z.boolean().optional(),
    categoryId: categoryIdSchema,
    customizationNameEnabled: z.boolean().default(false),
    customizationColorEnabled: z.boolean().default(false),
    customizationColorOptions: customizationColorOptionsSchema.default([]),
    variants: z.array(variantInputSchema).min(1, 'a product needs at least one variant'),
  })
  .superRefine(requireColorOptionsWhenEnabled);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    slug: slugSchema.optional(),
    description: z.string().max(20_000).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    featured: z.boolean().optional(),
    categoryId: categoryIdSchema,
    customizationNameEnabled: z.boolean().optional(),
    customizationColorEnabled: z.boolean().optional(),
    customizationColorOptions: customizationColorOptionsSchema.optional(),
  })
  .superRefine(requireColorOptionsWhenEnabled);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const stockAdjustmentSchema = z.object({
  /** signed delta; negative reduces stock. Absolute set is `mode: 'set'`. */
  mode: z.enum(['delta', 'set']).default('delta'),
  value: z.number().int(),
  reason: z.string().max(200).optional(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const adminProductListQuerySchema = z.object({
  search: z.string().max(200).trim().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

/** Inventory table filter — matches product title, variant name, or SKU. */
export const adminInventoryQuerySchema = z.object({
  search: z.string().max(200).trim().optional(),
});
export type AdminInventoryQuery = z.infer<typeof adminInventoryQuerySchema>;

// ── image inputs ────────────────────────────────────────────────────────────

export const attachImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(300),
  type: mediaTypeSchema.default('image'),
});
export type AttachImageInput = z.infer<typeof attachImageSchema>;

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().cuid()).min(1),
});
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;

/** Ties an image to one variant so the storefront can switch to it when that
 *  variant is selected. `null` clears the assignment (shown for all variants). */
export const setImageVariantSchema = z.object({
  variantId: z.string().cuid().nullable(),
});
export type SetImageVariantInput = z.infer<typeof setImageVariantSchema>;

export const uploadSignatureRequestSchema = z.object({
  folder: z.string().max(120).default('vidntec/products'),
});
export type UploadSignatureRequest = z.infer<typeof uploadSignatureRequestSchema>;

// ── DTOs ────────────────────────────────────────────────────────────────────

export const productImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  publicId: z.string().nullable(),
  position: z.number().int(),
  type: mediaTypeSchema,
  variantId: z.string().nullable(),
});
export type ProductImageDto = z.infer<typeof productImageSchema>;

export const adminVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  sku: z.string(),
  stock: z.number().int(),
});
export type AdminVariant = z.infer<typeof adminVariantSchema>;

export const adminProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.enum(PRODUCT_STATUSES),
  featured: z.boolean(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  customizationNameEnabled: z.boolean(),
  customizationColorEnabled: z.boolean(),
  customizationColorOptions: customizationColorOptionsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  images: z.array(productImageSchema),
  variants: z.array(adminVariantSchema),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const adminProductListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(PRODUCT_STATUSES),
  featured: z.boolean(),
  categoryName: z.string().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  variantCount: z.number().int(),
  totalStock: z.number().int(),
  priceMin: z.number().int(),
  priceMax: z.number().int(),
  createdAt: z.string().datetime(),
});
export type AdminProductListItem = z.infer<typeof adminProductListItemSchema>;

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });

export const uploadSignatureResponseSchema = z.object({
  cloudName: z.string(),
  apiKey: z.string(),
  timestamp: z.number().int(),
  signature: z.string(),
  folder: z.string(),
});
export type UploadSignatureResponse = z.infer<typeof uploadSignatureResponseSchema>;

export const inventoryItemSchema = z.object({
  variantId: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  variantName: z.string(),
  sku: z.string(),
  price: z.number().int(),
  stock: z.number().int(),
  lowStock: z.boolean(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// ── public storefront DTOs (used from M4) ───────────────────────────────────

/** `?featured=true` / `?onSale=true` from the storefront; absent → false. */
const boolParam = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === 'true' || v === '1');

export const storefrontListQuerySchema = z.object({
  q: z.string().max(200).trim().optional(),
  /** Filter to one category by its slug. */
  category: z.string().max(200).trim().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'title']).default('newest'),
  featured: boolParam,
  onSale: boolParam,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
export type StorefrontListQuery = z.infer<typeof storefrontListQuerySchema>;

/** Sale fields shared by the list item and the full product DTO. */
const saleFields = {
  /** Current sellable price range (what the customer pays). */
  priceMin: z.number().int(),
  priceMax: z.number().int(),
  /** `compareAtPrice ?? price` per variant — the "was" range. Equals price range when not on sale. */
  originalPriceMin: z.number().int(),
  originalPriceMax: z.number().int(),
  /** true when at least one variant has compareAtPrice > price. */
  onSale: z.boolean(),
  /** Largest whole-percent discount across on-sale variants; 0 when not on sale. */
  discountPercent: z.number().int(),
};

/** Review-aggregate fields shared by the list item and the full product DTO. */
const reviewFields = {
  /** Average of all rated reviews (rating-less reviews don't count); null with none. */
  avgRating: z.number().nullable(),
  reviewCount: z.number().int(),
};

export const publicVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  onSale: z.boolean(),
  stock: z.number().int(),
  inStock: z.boolean(),
});
export type PublicVariant = z.infer<typeof publicVariantSchema>;

export const publicProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  featured: z.boolean(),
  category: publicProductCategorySchema.nullable(),
  customizationNameEnabled: z.boolean(),
  customizationColorEnabled: z.boolean(),
  customizationColorOptions: customizationColorOptionsSchema,
  images: z.array(
    z.object({
      url: z.string().url(),
      position: z.number().int(),
      type: mediaTypeSchema,
      variantId: z.string().nullable(),
    }),
  ),
  variants: z.array(publicVariantSchema),
  inStock: z.boolean(),
  updatedAt: z.string().datetime(),
  ...saleFields,
  ...reviewFields,
});
export type PublicProduct = z.infer<typeof publicProductSchema>;

export const publicProductListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  featured: z.boolean(),
  primaryImageUrl: z.string().url().nullable(),
  inStock: z.boolean(),
  updatedAt: z.string().datetime(),
  ...saleFields,
  ...reviewFields,
});
export type PublicProductListItem = z.infer<typeof publicProductListItemSchema>;
