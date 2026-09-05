import { z } from 'zod';
import { ORDER_STATUSES } from '../constants';
import { shippingAddressSchema } from './common';

export const orderItemSchema = z.object({
  id: z.string(),
  variantId: z.string().nullable(),
  titleSnapshot: z.string(),
  priceSnapshot: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});
export type OrderItemDto = z.infer<typeof orderItemSchema>;

/** Full order — returned to the owning customer and to admins. */
export const orderDetailSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  userId: z.string().nullable(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(['stripe', 'cod']),
  currency: z.string(),
  subtotal: z.number().int(),
  shipping: z.number().int(),
  tax: z.number().int(),
  total: z.number().int(),
  shippingAddress: shippingAddressSchema,
  trackingNumber: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(orderItemSchema),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderSummarySchema = z.object({
  id: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(['stripe', 'cod']),
  total: z.number().int(),
  itemCount: z.number().int(),
  createdAt: z.string().datetime(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const adminOrderListItemSchema = orderSummarySchema.extend({
  email: z.string().email(),
});
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;

// ── admin actions ───────────────────────────────────────────────────────────

export const fulfillOrderSchema = z.object({
  trackingNumber: z.string().min(1).max(120).trim(),
});
export type FulfillOrderInput = z.infer<typeof fulfillOrderSchema>;

export const refundOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RefundOrderInput = z.infer<typeof refundOrderSchema>;

/** Manual admin override — set an order to any status. No emails or Stripe calls. */
export const setOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
export type SetOrderStatusInput = z.infer<typeof setOrderStatusSchema>;

export const adminOrderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

/**
 * Guest order tracking: the shown order number OR the courier tracking number,
 * plus the email used at checkout. Both must match a guest order.
 */
export const orderLookupSchema = z.object({
  reference: z.string().min(4).max(120).trim(),
  email: z.string().email().max(254).toLowerCase().trim(),
});
export type OrderLookupInput = z.infer<typeof orderLookupSchema>;

export const orderLookupResultSchema = z.object({ orderId: z.string() });
export type OrderLookupResult = z.infer<typeof orderLookupResultSchema>;
