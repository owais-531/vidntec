'use client';

import { CUSTOMIZATION_MAX_COLOR_OPTIONS, type CustomizationColorOption } from '@vidntec/shared';
import { Input } from '@/components/ui/field';

const emptyOption = (): CustomizationColorOption => ({ label: '', hex: '#8a1a1c' });

/**
 * Admin controls for a product's customer-facing personalization: an optional
 * printed name, and/or a color pick from a fixed set of admin-defined swatches.
 * Shared by the new/edit product forms — same fields, same validation shape.
 */
export function CustomizationFields({
  nameEnabled,
  onNameEnabledChange,
  colorEnabled,
  onColorEnabledChange,
  colorOptions,
  onColorOptionsChange,
  error,
}: {
  nameEnabled: boolean;
  onNameEnabledChange: (v: boolean) => void;
  colorEnabled: boolean;
  onColorEnabledChange: (v: boolean) => void;
  colorOptions: CustomizationColorOption[];
  onColorOptionsChange: (v: CustomizationColorOption[]) => void;
  error?: string;
}) {
  const setOption = (i: number, patch: Partial<CustomizationColorOption>) =>
    onColorOptionsChange(colorOptions.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Personalization</h2>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={nameEnabled}
          onChange={(e) => onNameEnabledChange(e.target.checked)}
          className="accent-brand-500"
        />
        Let customers add a printed name
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={colorEnabled}
          onChange={(e) => {
            onColorEnabledChange(e.target.checked);
            if (e.target.checked && colorOptions.length === 0) {
              onColorOptionsChange([emptyOption()]);
            }
          }}
          className="accent-brand-500"
        />
        Let customers choose a color
      </label>

      {colorEnabled ? (
        <div className="space-y-2 pl-6">
          {colorOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={opt.hex}
                onChange={(e) => setOption(i, { hex: e.target.value })}
                className="h-9 w-9 shrink-0 cursor-pointer rounded border border-paper-line"
                aria-label={`Color ${i + 1} swatch`}
              />
              <Input
                placeholder="Color name (e.g. Red)"
                value={opt.label}
                onChange={(e) => setOption(i, { label: e.target.value })}
              />
              <button
                type="button"
                disabled={colorOptions.length === 1}
                onClick={() => onColorOptionsChange(colorOptions.filter((_, idx) => idx !== i))}
                className="px-2 text-ink-muted hover:text-brand-600 disabled:opacity-30"
                aria-label="Remove color option"
              >
                ✕
              </button>
            </div>
          ))}
          {colorOptions.length < CUSTOMIZATION_MAX_COLOR_OPTIONS ? (
            <button
              type="button"
              onClick={() => onColorOptionsChange([...colorOptions, emptyOption()])}
              className="text-xs text-brand-600 hover:underline"
            >
              + Add color
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-brand-700">{error}</p> : null}
    </div>
  );
}
