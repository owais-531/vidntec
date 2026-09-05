import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { orderNumber } from '@vidntec/shared';
import { getAdminOrder } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { OrderView } from '@/components/order-view';
import { OrderActions } from '@/components/admin/order-actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order #${orderNumber(id)}` };
}

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={`Order #${orderNumber(order.id)}`}
        subtitle={order.email}
        action={
          <Link href="/admin/orders" className="text-xs text-ink-muted hover:text-ink">
            ← Back to orders
          </Link>
        }
      />
      <div className="space-y-5">
        <OrderActions order={order} />
        <OrderView order={order} />
      </div>
    </>
  );
}
