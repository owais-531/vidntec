import type { Metadata } from 'next';
import Link from 'next/link';
import { formatOrderDateTime } from '@vidntec/shared';
import { listReviewsAdmin } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { DeleteReviewButton } from '@/components/admin/delete-review-button';
import { Card } from '@/components/ui/card';
import { StarRating } from '@/components/store/star-rating';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Reviews' };

const RATINGS = [5, 4, 3, 2, 1] as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rating = RATINGS.includes(Number(sp.rating) as (typeof RATINGS)[number])
    ? Number(sp.rating)
    : undefined;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const pageSize = 20;
  const { items, total } = await listReviewsAdmin({ rating, page, pageSize });
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const href = (next: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { rating: rating ? String(rating) : undefined, page: String(page), ...next };
    if (merged.rating) usp.set('rating', merged.rating);
    if (merged.page && merged.page !== '1') usp.set('page', merged.page);
    const qs = usp.toString();
    return `/admin/reviews${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader title="Reviews" subtitle={`${total} review${total === 1 ? '' : 's'}`} />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link
          href="/admin/reviews"
          className={`rounded-card px-3 py-1.5 ${!rating ? 'bg-brand-50 text-brand-600' : 'bg-white text-ink-soft'}`}
        >
          All
        </Link>
        {RATINGS.map((r) => (
          <Link
            key={r}
            href={href({ rating: String(r), page: '1' })}
            className={`rounded-card px-3 py-1.5 ${rating === r ? 'bg-brand-50 text-brand-600' : 'bg-white text-ink-soft'}`}
          >
            {r}★
          </Link>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Comment</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                  No reviews.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-paper-line last:border-0 hover:bg-paper-sunken"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${r.productId}`}
                      className="font-medium text-ink hover:text-brand-600"
                    >
                      {r.productTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.authorName}</td>
                  <td className="px-4 py-3">
                    {r.rating != null ? <StarRating value={r.rating} size="xs" /> : '—'}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-ink-soft">{r.comment ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {formatOrderDateTime(r.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <DeleteReviewButton reviewId={r.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {lastPage > 1 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
          <span>
            Page {page} of {lastPage}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={href({ page: String(page - 1) })} className={buttonClasses('secondary', 'sm')}>
                Previous
              </Link>
            ) : null}
            {page < lastPage ? (
              <Link href={href({ page: String(page + 1) })} className={buttonClasses('secondary', 'sm')}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
