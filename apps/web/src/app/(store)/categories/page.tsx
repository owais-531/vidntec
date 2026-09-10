import type { Metadata } from 'next';
import Link from 'next/link';
import { listStorefrontCategories } from '@/lib/storefront/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { CategoryGrid } from '@/components/store/category-grid';

export const metadata: Metadata = {
  title: 'Shop by category',
  description:
    'Browse the VIDNTEC catalog of made-to-order 3D-printed products by category.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'Shop by category · VIDNTEC',
    description: 'Browse made-to-order 3D-printed products by category.',
    url: '/categories',
  },
};

export default async function CategoriesIndexPage() {
  const categories = await listStorefrontCategories();

  return (
    <div>
      <SectionHeading as="h1" title="Shop by category" />
      {categories.length === 0 ? (
        <div className="rounded-card bg-white py-16 text-center text-sm text-ink-muted">
          No categories yet.{' '}
          <Link href="/products" className="text-brand-600 hover:underline">
            Browse all products
          </Link>
          .
        </div>
      ) : (
        <CategoryGrid categories={categories} />
      )}
    </div>
  );
}
