'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatMoney, type PublicVariant } from '@vidntec/shared';
import { cn } from '@/lib/cn';
import { addToCartAction } from '@/lib/cart/actions';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

export function VariantPicker({ variants }: { variants: PublicVariant[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(
    variants.find((v) => v.inStock)?.id ?? variants[0]?.id ?? '',
  );
  const [qty, setQty] = useState(1);
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  if (!selected) return null;

  const maxQty = Math.max(1, Math.min(selected.stock, 99));

  const addToCart = () => {
    startTransition(async () => {
      const res = await addToCartAction(selected.id, qty);
      if (res.ok) {
        toast('Added to cart');
        router.refresh();
      } else {
        toast(res.error, 'error');
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold text-brand-500">{formatMoney(selected.price)}</span>
        {selected.onSale && selected.compareAtPrice != null ? (
          <>
            <span className="text-base text-ink-muted line-through">
              {formatMoney(selected.compareAtPrice)}
            </span>
            <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-semibold text-white">
              -{Math.round((1 - selected.price / selected.compareAtPrice) * 100)}%
            </span>
          </>
        ) : null}
      </div>

      {variants.length > 1 ? (
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            Option
          </span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedId(v.id);
                  setQty(1);
                }}
                className={cn(
                  'rounded-card border px-3 py-2 text-sm transition-colors',
                  v.id === selectedId
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-paper-line bg-white text-ink-soft hover:border-ink-faint',
                  !v.inStock && 'opacity-50',
                )}
              >
                {v.name}
                {!v.inStock ? <span className="ml-1 text-xs">(sold out)</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs font-medium">
        {selected.inStock ? (
          <span className="text-accent-600">
            In stock{selected.stock <= 5 ? ` — only ${selected.stock} left` : ''}
          </span>
        ) : (
          <span className="text-ink-muted">Currently sold out</span>
        )}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-card border border-paper-line bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-ink-soft hover:text-ink"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="px-3 py-2 text-ink-soft hover:text-ink disabled:opacity-30"
            disabled={qty >= maxQty}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <Button className="flex-1" onClick={addToCart} disabled={pending || !selected.inStock}>
          {pending ? 'Adding…' : selected.inStock ? 'Add to cart' : 'Sold out'}
        </Button>
      </div>
    </div>
  );
}
