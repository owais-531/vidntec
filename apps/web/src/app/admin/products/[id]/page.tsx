import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { EditProductForm } from '@/components/admin/edit-product-form';
import { VariantsEditor } from '@/components/admin/variants-editor';
import { ImageManager } from '@/components/admin/image-manager';
import { StatusBadge } from '@/components/ui/badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product?.title ?? 'Product' };
}

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.title}
        subtitle={`/${product.slug}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={product.status} />
            <Link href="/admin/products" className="text-xs text-ink-muted hover:text-ink">
              ← Back to products
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        <EditProductForm product={product} />
        <VariantsEditor productId={product.id} variants={product.variants} />
        <ImageManager productId={product.id} images={product.images} />
      </div>
    </>
  );
}
