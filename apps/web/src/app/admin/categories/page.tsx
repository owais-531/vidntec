import type { Metadata } from 'next';
import { getCategoriesAdmin } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryManager } from '@/components/admin/category-manager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const categories = await getCategoriesAdmin();
  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Shown on the storefront home page. Assigning a category to a product is optional."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
