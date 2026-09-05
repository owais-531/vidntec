import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney } from '@vidntec/shared';
import { getCart } from '@/lib/cart/queries';
import { CartLineRow } from '@/components/store/cart-line-row';
import { SectionHeading } from '@/components/store/section-heading';
import { Card, CardBody } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cart' };

export default async function CartPage() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-white p-10 text-center">
        <div className="text-3xl">🛒</div>
        <h1 className="mt-3 text-lg font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-ink-muted">Browse the catalog to add something.</p>
        <Link href="/products" className={buttonClasses('primary', 'md', 'mt-5')}>
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading title="Your cart" />

      {cart.removedCount > 0 ? (
        <p className="mb-4 rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
          {cart.removedCount} item{cart.removedCount === 1 ? ' is' : 's are'} no longer available
          and {cart.removedCount === 1 ? 'was' : 'were'} removed.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <div className="divide-y divide-paper-line px-5">
            {cart.lines.map((line) => (
              <CartLineRow key={line.itemId} line={line} />
            ))}
          </div>
        </Card>

        <div>
          <Card>
            <CardBody className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-semibold">{formatMoney(cart.subtotal)}</span>
              </div>
              <p className="text-xs text-ink-muted">Shipping &amp; tax calculated at checkout.</p>
              <Link href="/checkout" className={buttonClasses('primary', 'md', 'w-full')}>
                Proceed to checkout
              </Link>
              <Link
                href="/products"
                className="block text-center text-xs text-ink-muted hover:text-ink"
              >
                Continue shopping
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
