import { z } from 'zod';
import { shippingAddressSchema } from './common';

export const quoteRequestSchema = z.object({
  city: z.string().min(1).max(120),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

/**
 * The client NEVER sends prices. It sends contact + address + payment method;
 * the server recomputes every amount from current variant prices, the cart
 * cookie, and the shipping city (free for Rawalpindi/Islamabad, otherwise the
 * admin-configured rate).
 */
export const checkoutSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(['stripe', 'cod']),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const stripeCheckoutResultSchema = z.object({
  paymentMethod: z.literal('stripe'),
  checkoutUrl: z.string().url(),
});
export const codCheckoutResultSchema = z.object({
  paymentMethod: z.literal('cod'),
  orderId: z.string(),
});
export const checkoutResultSchema = z.discriminatedUnion('paymentMethod', [
  stripeCheckoutResultSchema,
  codCheckoutResultSchema,
]);
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

/** Quote preview shown before the customer commits. */
export const quoteSchema = z.object({
  subtotal: z.number().int(),
  shipping: z.number().int(),
  shippingFree: z.boolean(),
  tax: z.number().int(),
  taxLabel: z.string(),
  total: z.number().int(),
  currency: z.string(),
});
export type Quote = z.infer<typeof quoteSchema>;

/** Result of polling a Stripe session on the success page. */
export const checkoutSessionStatusSchema = z.object({
  paymentStatus: z.enum(['paid', 'unpaid', 'processing']),
  orderId: z.string().nullable(),
});
export type CheckoutSessionStatus = z.infer<typeof checkoutSessionStatusSchema>;
