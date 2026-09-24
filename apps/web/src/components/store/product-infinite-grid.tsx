'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { PublicProductListItem } from '@vidntec/shared';
import { loadMoreProductsAction } from '@/lib/actions/products';
import { ProductCard } from './product-card';

type SortValue = 'newest' | 'price-asc' | 'price-desc' | 'title';

export function ProductInfiniteGrid({
  initialItems,
  total,
  pageSize,
  q,
  sort,
}: {
  initialItems: PublicProductListItem[];
  total: number;
  pageSize: number;
  q?: string;
  sort: SortValue;
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = items.length < total;

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(false);
    startTransition(async () => {
      const nextPage = pageRef.current + 1;
      const res = await loadMoreProductsAction({ q, sort, page: nextPage, pageSize });
      loadingRef.current = false;
      if (res.ok) {
        pageRef.current = nextPage;
        setItems((prev) => [...prev, ...res.data.items]);
      } else {
        setError(true);
      }
    });
  }, [q, sort, pageSize]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    return (
      <div className="rounded-card bg-white py-16 text-center text-sm text-ink-muted">
        No products found.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {hasMore ? (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          {error ? (
            <button
              type="button"
              onClick={loadMore}
              className="text-xs font-medium text-brand-500 underline underline-offset-2"
            >
              Couldn&apos;t load more — retry
            </button>
          ) : (
            <span className="text-xs text-ink-muted">Loading more…</span>
          )}
        </div>
      ) : (
        <p className="mt-8 text-center text-xs text-ink-muted">
          You&apos;ve reached the end — {total} product{total === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  );
}
