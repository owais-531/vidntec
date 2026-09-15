'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { PublicReview, ReviewInput, UploadSignatureResponse } from '@vidntec/shared';
import { apiFetch } from '../api';
import { requireAdmin, requireUser } from '../auth';
import { runAction, type ActionResult } from './result';

/** Create or replace the signed-in customer's review for this product. */
export async function submitReviewAction(
  productId: string,
  productSlug: string,
  input: ReviewInput,
): Promise<ActionResult<PublicReview>> {
  await requireUser();
  const res = await runAction(() =>
    apiFetch<PublicReview>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) {
    // avgRating/reviewCount live on the cached product DTOs shown everywhere.
    revalidateTag('products');
    revalidatePath(`/products/${productSlug}`);
  }
  return res;
}

export async function getReviewUploadSignatureAction(): Promise<
  ActionResult<UploadSignatureResponse>
> {
  await requireUser();
  return runAction(() =>
    apiFetch<UploadSignatureResponse>('/reviews/uploads/signature', { method: 'POST' }),
  );
}

/** Customer: delete their own review for this product. */
export async function deleteMyReviewAction(
  productId: string,
  productSlug: string,
): Promise<ActionResult> {
  await requireUser();
  const res = await runAction(() =>
    apiFetch<undefined>(`/products/${productId}/reviews/mine`, { method: 'DELETE' }),
  );
  if (res.ok) {
    revalidateTag('products');
    revalidatePath(`/products/${productSlug}`);
  }
  return res;
}

/** Admin: permanently delete a review, for any reason. */
export async function deleteReviewAction(
  id: string,
  productSlug?: string,
): Promise<ActionResult> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<undefined>(`/admin/reviews/${id}`, { method: 'DELETE' }),
  );
  if (res.ok) {
    revalidateTag('products');
    revalidatePath('/admin/reviews');
    if (productSlug) revalidatePath(`/products/${productSlug}`);
  }
  return res;
}
