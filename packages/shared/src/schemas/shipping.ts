import { z } from 'zod';
import { centsSchema } from './common';

export const shippingRateInputSchema = z.object({
  name: z.string().min(1).max(120),
  price: centsSchema,
  minOrderForFree: centsSchema.nullable().optional(),
  active: z.boolean().default(true),
});
export type ShippingRateInput = z.infer<typeof shippingRateInputSchema>;

export const shippingRateUpdateSchema = shippingRateInputSchema.partial();
export type ShippingRateUpdate = z.infer<typeof shippingRateUpdateSchema>;

export const shippingRateSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int(),
  minOrderForFree: z.number().int().nullable(),
  active: z.boolean(),
});
export type ShippingRate = z.infer<typeof shippingRateSchema>;

export const storeSettingsInputSchema = z.object({
  taxEnabled: z.boolean().optional(),
  taxRateBps: z.number().int().min(0).max(10_000).optional(),
  taxLabel: z.string().min(1).max(60).optional(),
  currency: z.string().length(3).toLowerCase().optional(),
  storeName: z.string().min(1).max(120).optional(),
  supportEmail: z.string().email().or(z.literal('')).optional(),
});
export type StoreSettingsInput = z.infer<typeof storeSettingsInputSchema>;

export const storeSettingsSchema = z.object({
  taxEnabled: z.boolean(),
  taxRateBps: z.number().int(),
  taxLabel: z.string(),
  currency: z.string(),
  storeName: z.string(),
  supportEmail: z.string(),
});
export type StoreSettings = z.infer<typeof storeSettingsSchema>;
