import type { Metadata } from 'next';
import { Suspense } from 'react';
import { listStorefrontProducts } from '@/lib/storefront/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { ProductInfiniteGrid } from '@/components/store/product-infinite-grid';
import { SortSelect } from '@/components/store/sort-select';

export const metadata: Metadata = {
  title: 'All products',
  description:
    'Browse the full VIDNTEC catalog of 3D-printed products — desk organizers, planters, articulated toys and more, made to order.',
  // Filtered views collapse to the base listing for indexing.
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'All products · VIDNTEC',
    description: 'The full VIDNTEC catalog of made-to-order 3D-printed products.',
    url: '/products',
  },
};

type SortValue = 'newest' | 'price-asc' | 'price-desc' | 'title';
const SORTS = new Set<SortValue>(['newest', 'price-asc', 'price-desc', 'title']);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const sort: SortValue = SORTS.has(sp.sort as SortValue) ? (sp.sort as SortValue) : 'newest';
  // Divisible by 5 to match the grid's widest (xl:grid-cols-5) breakpoint,
  // so a full page's last row isn't short one card.
  const pageSize = 25;

  const { items, total } = await listStorefrontProducts({ q, sort, page: 1, pageSize });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeading as="h1" title={q ? `Results for “${q}”` : 'All products'} />
        <Suspense fallback={null}>
          <SortSelect />
        </Suspense>
      </div>
      <p className="mb-4 text-xs text-ink-muted">
        {total} product{total === 1 ? '' : 's'}
      </p>

      <ProductInfiniteGrid
        key={`${q ?? ''}:${sort}`}
        initialItems={items}
        total={total}
        pageSize={pageSize}
        q={q}
        sort={sort}
      />
    </div>
  );
}
