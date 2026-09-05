'use client';

import { useState, useTransition } from 'react';
import { adjustStockAction } from '@/lib/actions/catalog';
import { toast } from '@/components/ui/toast';

export function StockAdjuster({
  variantId,
  stock,
}: {
  variantId: string;
  stock: number;
}) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState('');

  const run = (mode: 'delta' | 'set', raw: string) => {
    const num = Number(raw);
    if (!Number.isFinite(num) || (mode === 'set' && num < 0)) {
      return toast('Enter a valid number', 'error');
    }
    start(async () => {
      const res = await adjustStockAction(variantId, { mode, value: Math.trunc(num) });
      if (res.ok) {
        toast(`Stock updated to ${res.data.stock}`);
        setValue('');
      } else {
        toast(res.error, 'error');
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending || stock <= 0}
        onClick={() => run('delta', '-1')}
        className="h-7 w-7 rounded border border-paper-line text-ink-soft hover:bg-paper-sunken disabled:opacity-30"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">{stock}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run('delta', '1')}
        className="h-7 w-7 rounded border border-paper-line text-ink-soft hover:bg-paper-sunken disabled:opacity-30"
      >
        +
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="set…"
        inputMode="numeric"
        className="ml-2 h-7 w-16 rounded border border-paper-line px-2 text-xs focus:border-brand-400 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) run('set', value);
        }}
      />
    </div>
  );
}
