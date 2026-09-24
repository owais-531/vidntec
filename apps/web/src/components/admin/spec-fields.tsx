'use client';

import type { ProductSpec } from '@vidntec/shared';
import { Input } from '@/components/ui/field';

const emptySpec = (): ProductSpec => ({ label: '', value: '' });

/**
 * Admin-editable "Details" rows for a product — freeform label/value pairs shown
 * on the PDP below the description. Shared by the new/edit product forms.
 */
export function SpecFields({
  specs,
  onSpecsChange,
  error,
}: {
  specs: ProductSpec[];
  onSpecsChange: (v: ProductSpec[]) => void;
  error?: string;
}) {
  const setSpec = (i: number, patch: Partial<ProductSpec>) =>
    onSpecsChange(specs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Details</h2>
      <p className="text-xs text-ink-muted">
        Optional label/value rows shown on the product page below the description
        (e.g. “Material” → “PLA+”). Add as many as you like.
      </p>

      {specs.length > 0 ? (
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Label (e.g. Material)"
                value={s.label}
                onChange={(e) => setSpec(i, { label: e.target.value })}
              />
              <Input
                placeholder="Value (e.g. PLA+)"
                value={s.value}
                onChange={(e) => setSpec(i, { value: e.target.value })}
              />
              <button
                type="button"
                onClick={() => onSpecsChange(specs.filter((_, idx) => idx !== i))}
                className="px-2 text-ink-muted hover:text-brand-600"
                aria-label="Remove detail row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onSpecsChange([...specs, emptySpec()])}
        className="text-xs text-brand-600 hover:underline"
      >
        + Add detail
      </button>

      {error ? <p className="text-xs text-brand-700">{error}</p> : null}
    </div>
  );
}
