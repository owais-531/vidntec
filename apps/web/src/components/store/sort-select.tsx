'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'title', label: 'Name: A–Z' },
];

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      Sort
      <select
        value={params.get('sort') ?? 'newest'}
        onChange={(e) => {
          const usp = new URLSearchParams(params.toString());
          usp.set('sort', e.target.value);
          usp.delete('page');
          router.push(`/products?${usp.toString()}`);
        }}
        className="rounded-card border border-paper-line bg-white px-2 py-1.5 text-xs text-ink focus:border-brand-400 focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
