import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCart } from '@/lib/cart/queries';
import { getShippingRates } from '@/lib/checkout/queries';
import { fetchCurrentUser } from '@/lib/auth';
import { SectionHeading } from '@/components/store/section-heading';
import { CheckoutForm } from '@/components/store/checkout-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage() {
  const [cart, rates, user] = await Promise.all([
    getCart(),
    getShippingRates(),
    fetchCurrentUser(),
  ]);

  if (cart.lines.length === 0) redirect('/cart');
  if (rates.length === 0) {
    return (
      <p className="rounded-card bg-white p-8 text-center text-sm text-ink-muted">
        Checkout is temporarily unavailable — no shipping options are configured.
      </p>
    );
  }

  return (
    <div>
      <SectionHeading title="Checkout" />
      <CheckoutForm cart={cart} rates={rates} defaultEmail={user?.email ?? ''} />
    </div>
  );
}
