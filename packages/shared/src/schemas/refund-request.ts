import { z } from 'zod';
import { REFUND_REQUEST_DETAILS_MAX_LENGTH, REFUND_REQUEST_MAX_IMAGES, REFUND_REQUEST_REASONS } from '../constants';

export const refundRequestPhotoSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(300).optional(),
});
export type RefundRequestPhoto = z.infer<typeof refundRequestPhotoSchema>;

/** Email-only — no DB record. The order is looked up (any owner, guest or
 *  signed-in) purely to verify the email actually matches before we notify. */
export const refundRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(254).toLowerCase().trim(),
  orderReference: z.string().trim().min(4).max(120),
  reason: z.enum(REFUND_REQUEST_REASONS),
  details: z.string().trim().min(1).max(REFUND_REQUEST_DETAILS_MAX_LENGTH),
  phone: z.string().trim().min(1).max(32),
  photos: z.array(refundRequestPhotoSchema).max(REFUND_REQUEST_MAX_IMAGES).default([]),
});
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
