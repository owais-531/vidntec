import type { Metadata } from 'next';
import Link from 'next/link';
import { getCheckoutSessionStatus } from '@/lib/checkout/queries';
import { Card, CardBody } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order confirmed' };

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; email?: string; session_id?: string }>;
}) {
  const sp = await searchParams;

  let heading = 'Thank you for your order';
  let body: React.ReactNode = null;
  let refresh = false;
  let orderLink: string | null = null;

  if (sp.order) {
    orderLink = `/orders/${sp.order}${sp.email ? `?email=${encodeURIComponent(sp.email)}` : ''}`;
    body = (
      <>
        <p className="text-sm text-ink-soft">
          Order <span className="font-semibold">#{shortId(sp.order)}</span> is placed and will be
          paid <span className="font-medium">on delivery</span>.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          We&apos;ve emailed a confirmation. We&apos;ll be in touch to arrange delivery.
        </p>
      </>
    );
  } else if (sp.session_id) {
    const status = await getCheckoutSessionStatus(sp.session_id).catch(() => null);
    if (status?.paymentStatus === 'paid' && status.orderId) {
      orderLink = `/orders/${status.orderId}`;
      body = (
        <p className="text-sm text-ink-soft">
          Payment received — order <span className="font-semibold">#{shortId(status.orderId)}</span>{' '}
          is confirmed. A receipt is on its way to your inbox.
        </p>
      );
    } else if (status?.paymentStatus === 'processing') {
      refresh = true;
      body = (
        <p className="text-sm text-ink-soft">
          Payment received — we&apos;re finalising your order. This page will update in a moment.
        </p>
      );
    } else {
      heading = 'Payment not completed';
      body = (
        <p className="text-sm text-ink-soft">
          It looks like the payment wasn&apos;t completed. Your cart is still saved.
        </p>
      );
    }
  } else {
    heading = 'Nothing to show';
    body = <p className="text-sm text-ink-muted">No order reference was provided.</p>;
  }

  return (
    <div className="mx-auto max-w-md">
      {refresh ? <meta httpEquiv="refresh" content="4" /> : null}
      <Card>
        <CardBody className="text-center">
          <div className="text-3xl text-brand-500">⚡</div>
          <h1 className="mt-3 text-lg font-semibold">{heading}</h1>
          <div className="mt-2">{body}</div>
          <div className="mt-5 flex justify-center gap-3">
            {orderLink ? (
              <Link href={orderLink} className={buttonClasses('secondary', 'md')}>
                View order
              </Link>
            ) : null}
            <Link href="/products" className={buttonClasses('primary', 'md')}>
              Continue shopping
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
