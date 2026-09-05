import type { Metadata } from 'next';
import Link from 'next/link';
import { ORDER_STATUSES, formatMoney, formatOrderDateTime, orderNumber } from '@vidntec/shared';
import { listOrders } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { DeleteOrderButton } from '@/components/admin/delete-order-button';
import { Card } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/order-status-badge';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Orders' };

const STATUSES = new Set<string>(ORDER_STATUSES);

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.has(sp.status ?? '') ? (sp.status as (typeof ORDER_STATUSES)[number]) : undefined;
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const pageSize = 20;
  const { items, total } = await listOrders({ status, page, pageSize });
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const href = (next: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { status, page: String(page), ...next };
    if (merged.status) usp.set('status', merged.status);
    if (merged.page && merged.page !== '1') usp.set('page', merged.page);
    const qs = usp.toString();
    return `/admin/orders${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? '' : 's'}`} />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link
          href="/admin/orders"
          className={`rounded-card px-3 py-1.5 ${!status ? 'bg-brand-50 text-brand-600' : 'bg-white text-ink-soft'}`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s, page: '1' })}
            className={`rounded-card px-3 py-1.5 capitalize ${status === s ? 'bg-brand-50 text-brand-600' : 'bg-white text-ink-soft'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                  No orders.
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-paper-line last:border-0 hover:bg-paper-sunken"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-ink hover:text-brand-600"
                    >
                      #{orderNumber(o.id)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {formatOrderDateTime(o.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{o.email}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {o.paymentMethod === 'cod' ? 'COD' : 'Card'}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMoney(o.total)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <DeleteOrderButton orderId={o.id} />
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
              <Link href={href({ page: String(page - 1) })} className={buttonClasses('secondary', 'sm')}>
                Previous
              </Link>
            ) : null}
            {page < lastPage ? (
              <Link href={href({ page: String(page + 1) })} className={buttonClasses('secondary', 'sm')}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
