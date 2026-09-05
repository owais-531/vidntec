import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { NewProductForm } from '@/components/admin/new-product-form';

export const metadata: Metadata = { title: 'New product' };

export default function NewProductPage() {
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
      <NewProductForm />
    </>
  );
}
