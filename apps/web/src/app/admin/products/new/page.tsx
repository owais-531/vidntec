import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategoriesAdmin } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { NewProductForm } from '@/components/admin/new-product-form';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage() {
  const categories = await getCategoriesAdmin();
  return (
    <>
      <PageHeader
        title="New product"
        action={
          <Link href="/admin/products" className="text-xs text-ink-muted hover:text-ink">
            ← Back to products
          </Link>
        }
      />
      <NewProductForm categories={categories} />
    </>
  );
}
