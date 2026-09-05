'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/field';

export function InventorySearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');

  const apply = (value: string) => {
    const usp = new URLSearchParams(params.toString());
    if (value.trim()) usp.set('search', value.trim());
    else usp.delete('search');
    router.push(`/admin/inventory${usp.toString() ? `?${usp}` : ''}`);
  };

  return (
    <form
      className="mb-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(search);
      }}
    >
      <Input
        className="flex-1"
        placeholder="Search inventory by product, variant, or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search ? (
        <button
          type="button"
          onClick={() => {
            setSearch('');
            apply('');
          }}
          className="shrink-0 rounded-card border border-paper-line px-3 text-xs text-ink-muted hover:text-ink"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
