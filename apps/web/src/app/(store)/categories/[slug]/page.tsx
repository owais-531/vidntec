import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStorefrontCategory, listStorefrontProducts } from '@/lib/storefront/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { ProductGrid } from '@/components/store/product-grid';
import { SortSelect } from '@/components/store/sort-select';
import { Pager } from '@/components/store/pager';

type SortValue = 'newest' | 'price-asc' | 'price-desc' | 'title';
const SORTS = new Set<SortValue>(['newest', 'price-asc', 'price-desc', 'title']);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getStorefrontCategory(slug);
  if (!category) return { title: 'Not found' };

  const path = `/categories/${category.slug}`;
  const description = `Browse ${category.name} — made-to-order 3D-printed products from VIDNTEC.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${category.name} · VIDNTEC`, description, url: path },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getStorefrontCategory(slug);
  if (!category) notFound();

  const sort: SortValue = SORTS.has(sp.sort as SortValue) ? (sp.sort as SortValue) : 'newest';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const pageSize = 24;

  const { items, total } = await listStorefrontProducts({
    category: slug,
    sort,
    page,
    pageSize,
  });
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (p: number) => {
    const usp = new URLSearchParams();
    if (sort !== 'newest') usp.set('sort', sort);
    if (p > 1) usp.set('page', String(p));
    const qs = usp.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ''}`;
  };

  return (
    <div>
      <nav className="mb-5 text-xs text-ink-muted">
        <Link href="/categories" className="hover:text-ink">
          Categories
        </Link>{' '}
        <span aria-hidden>/</span> <span className="text-ink-soft">{category.name}</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeading as="h1" title={category.name} />
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
