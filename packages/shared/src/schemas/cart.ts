import { z } from 'zod';
import { MAX_CART_ITEM_QUANTITY } from '../constants';

export const addCartItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(MAX_CART_ITEM_QUANTITY).default(1),
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
