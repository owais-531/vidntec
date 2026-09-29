'use client';

import { useRouter } from 'next/navigation';
import { deleteReviewAction } from '@/lib/actions/reviews';
import { ConfirmButton } from '@/components/ui/confirm-button';

export function DeleteReviewButton({
  reviewId,
  productSlug,
}: {
  reviewId: string;
  productSlug?: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      message="Delete review?"
      confirmLabel="Delete"
      successMessage="Review deleted"
      action={async () => {
        const res = await deleteReviewAction(reviewId, productSlug);
        if (res.ok) router.refresh();
        return res;
      }}
    >
      🗑
    </ConfirmButton>
  );
}
