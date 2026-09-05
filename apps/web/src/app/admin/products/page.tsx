import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@vidntec/shared';
import { listProducts } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { ProductListControls } from '@/components/admin/product-list-controls';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Products' };

function priceLabel(min: number, max: number) {
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const pageSize = 20;
  const { items, total } = await listProducts({
    search: sp.search,
    status: sp.status === 'active' || sp.status === 'draft' ? sp.status : undefined,
    page,
    pageSize,
  });
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (p: number) => {
    const usp = new URLSearchParams();
    if (sp.search) usp.set('search', sp.search);
    if (sp.status) usp.set('status', sp.status);
    usp.set('page', String(p));
    return `/admin/products?${usp.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${total} product${total === 1 ? '' : 's'}`}
        action={
          <Link href="/admin/products/new" className={buttonClasses('primary', 'md')}>
            + New product
          </Link>
        }
      />

      <ProductListControls />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="w-14 px-4 py-3" />
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                  No products found.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-paper-line last:border-0 hover:bg-paper-sunken"
                >
                  <td className="px-4 py-3">
                    <div className="h-10 w-10 overflow-hidden rounded bg-paper-sunken">
                      {p.primaryImageUrl ? (
                        <Image
                          src={p.primaryImageUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-ink hover:text-brand-600"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-ink-faint">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{p.variantCount}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.totalStock}</td>
                  <td className="px-4 py-3 font-medium text-brand-600">
                    {priceLabel(p.priceMin, p.priceMax)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
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
              <Link href={pageHref(page - 1)} className={buttonClasses('secondary', 'sm')}>
                Previous
              </Link>
            ) : null}
            {page < lastPage ? (
              <Link href={pageHref(page + 1)} className={buttonClasses('secondary', 'sm')}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
