'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PRODUCT_STATUSES } from '@vidntec/shared';
import { Input, Select } from '@/components/ui/field';

export function ProductListControls() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');

  const apply = (next: Record<string, string>) => {
    const usp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) usp.set(k, v);
      else usp.delete(k);
    }
    usp.delete('page');
    router.push(`/admin/products${usp.toString() ? `?${usp}` : ''}`);
  };

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
      <form
        className="min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ search });
        }}
      >
        <Input
          placeholder="Search products by title or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <div className="shrink-0 sm:w-44">
        <Select
          value={params.get('status') ?? ''}
          onChange={(e) => apply({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0]!.toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
