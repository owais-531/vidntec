import { z } from 'zod';
import { paginationQuerySchema } from './common';
import {
  REVIEW_AUTHOR_NAME_MAX_LENGTH,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_MAX_IMAGES,
} from '../constants';

// ── inputs (customer) ───────────────────────────────────────────────────────

export const reviewImageInputSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(300).optional(),
});
export type ReviewImageInput = z.infer<typeof reviewImageInputSchema>;

/** Create or replace the signed-in customer's review for one product. */
export const reviewInputSchema = z
  .object({
    authorName: z.string().trim().min(1).max(REVIEW_AUTHOR_NAME_MAX_LENGTH),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    comment: z.string().trim().max(REVIEW_COMMENT_MAX_LENGTH).nullable().optional(),
    images: z.array(reviewImageInputSchema).max(REVIEW_MAX_IMAGES).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.rating == null && !data.comment?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Give a star rating and/or write a comment',
        path: ['comment'],
      });
    }
  });
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const reviewListQuerySchema = paginationQuerySchema;
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const adminReviewListQuerySchema = paginationQuerySchema.extend({
  productId: z.string().cuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;

// ── DTOs ────────────────────────────────────────────────────────────────────

export const reviewImageSchema = z.object({
  url: z.string().url(),
});
export type ReviewImageDto = z.infer<typeof reviewImageSchema>;

export const publicReviewSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  rating: z.number().int().nullable(),
  comment: z.string().nullable(),
  images: z.array(reviewImageSchema),
  createdAt: z.string().datetime(),
});
export type PublicReview = z.infer<typeof publicReviewSchema>;

/** Moderation-list row — includes what the customer-facing DTO doesn't need. */
export const adminReviewSchema = publicReviewSchema.extend({
  productId: z.string(),
  productTitle: z.string(),
  userId: z.string(),
  userEmail: z.string(),
});
export type AdminReview = z.infer<typeof adminReviewSchema>;

/** `GET .../reviews/mine` — includes each image's Cloudinary publicId (unlike
 *  the public DTO) so re-submitting an edit without touching photos can keep
 *  them tied to their existing asset instead of losing that link. */
export const myReviewSchema = publicReviewSchema
  .omit({ images: true })
  .extend({ images: z.array(z.object({ url: z.string().url(), publicId: z.string().nullable() })) });
export type MyReview = z.infer<typeof myReviewSchema>;
