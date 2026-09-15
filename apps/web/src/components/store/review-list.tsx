import { formatOrderDate } from '@vidntec/shared';
import type { PublicReview } from '@vidntec/shared';
import { StarRating } from './star-rating';
import { ReviewImageThumbnails } from './review-image-lightbox';
import { Pager } from './pager';

export function ReviewList({
  reviews,
  page,
  lastPage,
  slug,
}: {
  reviews: PublicReview[];
  page: number;
  lastPage: number;
  slug: string;
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-ink-muted">No reviews yet — be the first to write one.</p>;
  }

  return (
    <div>
      <ul className="space-y-6">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-paper-line pb-6 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">{r.authorName}</span>
              <span className="text-xs text-ink-muted">{formatOrderDate(r.createdAt)}</span>
            </div>
            {r.rating != null ? (
              <div className="mt-1">
                <StarRating value={r.rating} size="sm" />
              </div>
            ) : null}
            {r.comment ? <p className="mt-2 text-sm text-ink-soft">{r.comment}</p> : null}
            <ReviewImageThumbnails urls={r.images.map((i) => i.url)} />
          </li>
        ))}
      </ul>
      <Pager
        page={page}
        lastPage={lastPage}
        hrefFor={(p) => `/products/${slug}${p > 1 ? `?reviewsPage=${p}` : ''}`}
      />
    </div>
  );
}
