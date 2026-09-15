import { z } from 'zod';
import { CUSTOMIZATION_NAME_MAX_LENGTH, MAX_CART_ITEM_QUANTITY } from '../constants';

export const addCartItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(MAX_CART_ITEM_QUANTITY).default(1),
  /** Printed name, when the product has personalization enabled. */
  customName: z.string().trim().min(1).max(CUSTOMIZATION_NAME_MAX_LENGTH).optional(),
  /**
   * Label of the chosen color option, when the product has color personalization
   * enabled. The server resolves this to the admin's own hex for that label —
   * a client-sent hex is never trusted.
   */
  customColorLabel: z.string().min(1).max(40).optional(),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(MAX_CART_ITEM_QUANTITY),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

/**
 * Server-computed cart view. `unitPrice` / `lineTotal` / `subtotal` are ALWAYS
 * recomputed on the server from the current variant price — client-supplied
 * prices are never trusted.
 */
export const cartLineSchema = z.object({
  itemId: z.string(),
  variantId: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productTitle: z.string(),
  variantName: z.string(),
  imageUrl: z.string().url().nullable(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
  availableStock: z.number().int(),
  maxQuantity: z.number().int(),
  /** true when the stored quantity now exceeds available stock */
  exceedsStock: z.boolean(),
  customName: z.string().nullable(),
  customColorLabel: z.string().nullable(),
  customColorHex: z.string().nullable(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const cartViewSchema = z.object({
  id: z.string().nullable(), // null = no cart yet (empty)
  lines: z.array(cartLineSchema),
  subtotal: z.number().int(),
  itemCount: z.number().int(),
  /** lines dropped from the view because the product was unpublished/deleted */
  removedCount: z.number().int(),
});
export type CartView = z.infer<typeof cartViewSchema>;
