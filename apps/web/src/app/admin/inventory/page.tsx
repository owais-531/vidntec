import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney, LOW_STOCK_THRESHOLD } from '@vidntec/shared';
import { getInventory } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { InventorySearch } from '@/components/admin/inventory-search';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StockAdjuster } from '@/components/admin/stock-adjuster';

export const metadata: Metadata = { title: 'Inventory' };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const rows = await getInventory(search);
  const low = rows.filter((r) => r.lowStock).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={
          search
            ? `${rows.length} match${rows.length === 1 ? '' : 'es'} for “${search}”`
            : `${rows.length} variants · ${low} at or below ${LOW_STOCK_THRESHOLD} in stock`
        }
      />

      <InventorySearch />

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink-muted">
          {search ? 'No variants match your search.' : 'No variants yet.'}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.variantId}
                  className="border-b border-paper-line last:border-0 hover:bg-paper-sunken"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/products/${r.productId}`}
                      className="font-medium text-ink hover:text-brand-600"
                    >
                      {r.productTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{r.variantName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">{r.sku}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{formatMoney(r.price)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <StockAdjuster variantId={r.variantId} stock={r.stock} />
                      {r.lowStock ? <Badge tone="red">Low</Badge> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
