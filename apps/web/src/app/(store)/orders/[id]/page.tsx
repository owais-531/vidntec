import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/orders/queries';
import { OrderView } from '@/components/order-view';
import { SectionHeading } from '@/components/store/section-heading';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order' };

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const [{ id }, { email }] = await Promise.all([params, searchParams]);
  const order = await getOrder(id, email);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <SectionHeading title="Order status" />
        <Link href="/products" className="text-xs text-ink-muted hover:text-ink">
          Continue shopping
        </Link>
      </div>
      <OrderView order={order} />
    </div>
  );
}
