import type { Metadata } from 'next';
import { Suspense } from 'react';
import { listStorefrontProducts } from '@/lib/storefront/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { ProductGrid } from '@/components/store/product-grid';
import { SortSelect } from '@/components/store/sort-select';
import { Pager } from '@/components/store/pager';

export const metadata: Metadata = {
  title: 'All products',
  description:
    'Browse the full VIDNTEC catalog of 3D-printed products — desk organizers, planters, articulated toys and more, made to order.',
  // Filtered / paginated views collapse to the base listing for indexing.
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
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const sort: SortValue = SORTS.has(sp.sort as SortValue) ? (sp.sort as SortValue) : 'newest';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const pageSize = 24;

  const { items, total } = await listStorefrontProducts({ q, sort, page, pageSize });
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set('q', q);
    if (sort !== 'newest') usp.set('sort', sort);
    if (p > 1) usp.set('page', String(p));
    const qs = usp.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

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

      <ProductGrid products={items} />
      <Pager page={page} lastPage={lastPage} hrefFor={hrefFor} />
    </div>
  );
}
