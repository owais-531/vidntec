'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function SearchForm({ variant = 'header' }: { variant?: 'header' | 'inline' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
      }}
      className={
        variant === 'header'
          ? 'flex flex-1 items-stretch overflow-hidden rounded-card bg-white'
          : 'flex items-stretch overflow-hidden rounded-card border border-paper-line bg-white'
      }
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 bg-ink px-4 text-xs font-semibold text-white"
      >
        <span aria-hidden>⌕</span> Search
      </button>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for products…"
        className="min-w-0 flex-1 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </form>
  );
}
