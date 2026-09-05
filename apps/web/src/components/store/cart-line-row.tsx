'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { formatMoney, type CartLine } from '@vidntec/shared';
import { removeCartLineAction, updateCartLineAction } from '@/lib/cart/actions';
import { toast } from '@/components/ui/toast';

export function CartLineRow({ line }: { line: CartLine }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const mutate = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else toast(res.error ?? 'Could not update cart', 'error');
    });

  const setQty = (q: number) => mutate(() => updateCartLineAction(line.variantId, q));

  return (
    <div className={pending ? 'opacity-60' : undefined}>
      <div className="flex gap-4 py-4">
        <Link
          href={`/products/${line.productSlug}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-paper-sunken"
        >
          {line.imageUrl ? (
            <Image src={line.imageUrl} alt="" fill sizes="80px" className="object-contain p-1" />
          ) : (
            <span className="flex h-full items-center justify-center text-ink-faint">⚡</span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${line.productSlug}`}
            className="text-sm font-medium text-ink hover:text-brand-600"
          >
            {line.productTitle}
          </Link>
          <p className="text-xs text-ink-muted">{line.variantName}</p>
          <p className="mt-1 text-xs text-ink-soft">{formatMoney(line.unitPrice)} each</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center rounded-card border border-paper-line bg-white">
              <button
                type="button"
                disabled={pending}
                onClick={() => setQty(line.quantity - 1)}
                className="px-2.5 py-1 text-ink-soft hover:text-ink"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
              <button
                type="button"
                disabled={pending || line.quantity >= line.maxQuantity}
                onClick={() => setQty(line.quantity + 1)}
                className="px-2.5 py-1 text-ink-soft hover:text-ink disabled:opacity-30"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => mutate(() => removeCartLineAction(line.variantId))}
              className="text-xs text-ink-muted underline underline-offset-2 hover:text-brand-600"
            >
              Remove
            </button>
          </div>

          {line.exceedsStock ? (
            <p className="mt-1.5 text-xs text-brand-600">
              Only {line.availableStock} in stock — quantity will be reduced at checkout.
            </p>
          ) : null}
        </div>

        <div className="text-sm font-semibold text-ink">{formatMoney(line.lineTotal)}</div>
      </div>
    </div>
  );
}
