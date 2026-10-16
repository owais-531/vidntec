'use client';

import type { ReactNode } from 'react';
import type { PersonalizationField, PersonalizationInput } from '@vidntec/shared';
import { Input, Select } from '@/components/ui/field';

/**
 * The "Make it yours" card on the product page: renders the product's
 * admin-defined fields (text / dropdown / checkbox) in order. Fully controlled —
 * the parent owns the answers (`values`, keyed by field id; a ticked checkbox is
 * the string "true") and validates them before adding to cart.
 */
export function PersonalizationForm({
  productTitle,
  fields,
  values,
  onChange,
  errors = {},
  renderAfter,
}: {
  productTitle: string;
  fields: PersonalizationField[];
  values: PersonalizationInput;
  onChange: (fieldId: string, value: string) => void;
  errors?: Record<string, string>;
  /** Extra UI under a given field (the AI preview button goes under the name). */
  renderAfter?: (field: PersonalizationField) => ReactNode;
}) {
  if (fields.length === 0) return null;
  const anyRequired = fields.some((f) => f.required);

  return (
    <section aria-labelledby="make-it-yours" className="space-y-3">
      <div>
        <h2 id="make-it-yours" className="text-lg font-semibold">
          Make it yours
        </h2>
        <p className="text-sm text-ink-muted">
          Choose the details for each item. Check names and spelling before ordering.
          {anyRequired ? ' Fields marked * are required.' : ''}
        </p>
      </div>

      <div className="space-y-4 rounded-card border border-paper-line bg-white p-4">
        <p className="text-sm font-semibold">{productTitle}</p>

        {fields.map((f) => {
          const id = `pf-${f.id}`;
          const error = errors[f.id];
          const star = f.required ? <span className="text-brand-600"> *</span> : null;

          return (
            <div key={f.id}>
              {f.type === 'checkbox' ? (
                <label htmlFor={id} className="flex items-start gap-2 text-sm font-medium">
                  <input
                    id={id}
                    type="checkbox"
                    checked={values[f.id] === 'true'}
                    onChange={(e) => onChange(f.id, e.target.checked ? 'true' : '')}
                    className="mt-0.5 h-4 w-4 accent-brand-500"
                  />
                  <span>
                    {f.label}
                    {star}
                  </span>
                </label>
              ) : (
                <>
                  <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
                    {f.label}
                    {star}
                  </label>
                  {f.type === 'text' ? (
                    <Input
                      id={id}
                      value={values[f.id] ?? ''}
                      onChange={(e) => onChange(f.id, e.target.value.slice(0, f.maxLength))}
                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                      maxLength={f.maxLength}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const hex = f.choices.find((c) => c.label === values[f.id])?.hex;
                        return hex ? (
                          <span
                            className="h-5 w-5 shrink-0 rounded-full border border-paper-line"
                            style={{ backgroundColor: hex }}
                            aria-hidden
                          />
                        ) : null;
                      })()}
                      <Select
                        id={id}
                        value={values[f.id] ?? ''}
                        onChange={(e) => onChange(f.id, e.target.value)}
                      >
                        <option value="">Choose an option</option>
                        {f.choices.map((c) => (
                          <option key={c.label} value={c.label}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </>
              )}
              {error ? <p className="mt-1 text-xs text-brand-700">{error}</p> : null}
              {renderAfter?.(f)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
