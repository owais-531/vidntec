import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney, formatOrderDateTime, orderNumber } from '@vidntec/shared';
import { requireUser } from '@/lib/auth';
import { listMyOrders } from '@/lib/orders/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { Card } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/order-status-badge';
import { buttonClasses } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My orders' };

export default async function MyOrdersPage() {
  await requireUser();
  const orders = await listMyOrders();

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeading title="My orders" />

      {orders.length === 0 ? (
        <div className="rounded-card bg-white p-10 text-center">
          <p className="text-sm text-ink-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className={buttonClasses('primary', 'md', 'mt-4')}>
            Shop products
          </Link>
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-paper-line">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-paper-sunken"
              >
                <div>
                  <p className="text-sm font-medium">Order #{orderNumber(o.id)}</p>
                  <p className="text-xs text-ink-muted">
                    {formatOrderDateTime(o.createdAt)} · {o.itemCount} item
                    {o.itemCount === 1 ? '' : 's'} · {formatMoney(o.total)}
                  </p>
                </div>
                <OrderStatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
