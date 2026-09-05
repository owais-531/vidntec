import { z } from 'zod';

export const cuidSchema = z.string().cuid();

export const centsSchema = z
  .number()
  .int('must be an integer number of cents')
  .nonnegative('must not be negative');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug');

export const shippingAddressSchema = z.object({
  name: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  postalCode: z.string().max(32).optional(),
  country: z.string().length(2, 'ISO 3166-1 alpha-2 country code'),
  phone: z.string().max(32).optional(),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
