'use client';

import {
  PERSONALIZATION_MAX_CHOICES,
  PERSONALIZATION_MAX_FIELDS,
  PERSONALIZATION_TEXT_HARD_MAX,
  type PersonalizationFieldType,
} from '@vidntec/shared';
import { Input, Select } from '@/components/ui/field';
import { emptyDraft, type FieldDraft } from '@/lib/personalization-draft';

const TYPE_LABELS: Record<PersonalizationFieldType, string> = {
  text: 'Text box',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox (tick box)',
};

/**
 * Admin builder for a product's "Make it yours" fields. Optional: a product
 * with no fields has no personalization section on the storefront at all.
 * Shared by the new/edit product forms.
 */
export function PersonalizationFieldsEditor({
  drafts,
  onChange,
  error,
}: {
  drafts: FieldDraft[];
  onChange: (next: FieldDraft[]) => void;
  error?: string;
}) {
  const patch = (i: number, p: Partial<FieldDraft>) =>
    onChange(drafts.map((d, idx) => (idx === i ? { ...d, ...p } : d)));

  const changeType = (i: number, type: PersonalizationFieldType) => {
    const d = drafts[i]!;
    patch(i, {
      type,
      choices: type === 'dropdown' && d.choices.length === 0 ? [{ label: '', hex: '' }] : d.choices,
    });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= drafts.length) return;
    const next = [...drafts];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  const setChoice = (i: number, ci: number, p: Partial<{ label: string; hex: string }>) =>
    patch(i, {
      choices: drafts[i]!.choices.map((c, idx) => (idx === ci ? { ...c, ...p } : c)),
    });

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Personalization (optional)</h2>
        <p className="text-xs text-ink-muted">
          Add fields customers fill in before adding to cart — e.g. a name, a colour, a gift-wrap
          tick box. Leave empty if this product needs none. Price never changes with these.
        </p>
      </div>

      {drafts.map((d, i) => (
        <div key={d.id} className="space-y-3 rounded-card border border-paper-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-0 flex-1"
              placeholder="Field name (e.g. Name, Main Alphabet Color)"
              value={d.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              aria-label={`Field ${i + 1} name`}
            />
            <Select
              className="w-44 shrink-0"
              value={d.type}
              onChange={(e) => changeType(i, e.target.value as PersonalizationFieldType)}
              aria-label={`Field ${i + 1} type`}
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="px-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                aria-label="Move field up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === drafts.length - 1}
                className="px-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                aria-label="Move field down"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => onChange(drafts.filter((_, idx) => idx !== i))}
                className="px-1.5 text-ink-muted hover:text-brand-600"
                aria-label="Remove field"
              >
                ✕
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={d.required}
              onChange={(e) => patch(i, { required: e.target.checked })}
              className="accent-brand-500"
            />
            {d.type === 'checkbox'
              ? 'Required — customer must tick it (e.g. “I’ve checked the spelling”)'
              : 'Required — customer must fill this in'}
          </label>

          {d.type === 'text' ? (
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-0 flex-1"
                placeholder="Hint shown in the box (e.g. Enter name)"
                value={d.placeholder}
                onChange={(e) => patch(i, { placeholder: e.target.value })}
                aria-label={`Field ${i + 1} hint text`}
              />
              <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
                Max characters
                <Input
                  type="number"
                  min={1}
                  max={PERSONALIZATION_TEXT_HARD_MAX}
                  className="w-20"
                  value={d.maxLength}
                  onChange={(e) => patch(i, { maxLength: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {d.type === 'dropdown' ? (
            <div className="space-y-2">
              {d.choices.map((c, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  {c.hex ? (
                    <input
                      type="color"
                      value={c.hex}
                      onChange={(e) => setChoice(i, ci, { hex: e.target.value })}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-paper-line"
                      aria-label={`Choice ${ci + 1} swatch`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setChoice(i, ci, { hex: '#8a1a1c' })}
                      className="h-9 w-9 shrink-0 rounded border border-dashed border-paper-line text-xs text-ink-muted hover:border-brand-400"
                      title="Add a colour swatch"
                      aria-label={`Add swatch to choice ${ci + 1}`}
                    >
                      🎨
                    </button>
                  )}
                  <Input
                    placeholder="Choice (e.g. Red)"
                    value={c.label}
                    onChange={(e) => setChoice(i, ci, { label: e.target.value })}
                  />
                  {c.hex ? (
                    <button
                      type="button"
                      onClick={() => setChoice(i, ci, { hex: '' })}
                      className="shrink-0 text-xs text-ink-muted hover:text-brand-600"
                    >
                      no swatch
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={d.choices.length === 1}
                    onClick={() =>
                      patch(i, { choices: d.choices.filter((_, idx) => idx !== ci) })
                    }
                    className="px-2 text-ink-muted hover:text-brand-600 disabled:opacity-30"
                    aria-label="Remove choice"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {d.choices.length < PERSONALIZATION_MAX_CHOICES ? (
                <button
                  type="button"
                  onClick={() => patch(i, { choices: [...d.choices, { label: '', hex: '' }] })}
                  className="text-xs text-brand-600 hover:underline"
                >
                  + Add choice
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      {drafts.length < PERSONALIZATION_MAX_FIELDS ? (
        <button
          type="button"
          onClick={() => onChange([...drafts, emptyDraft('text')])}
          className="text-sm text-brand-600 hover:underline"
        >
          + Add personalization field
        </button>
      ) : (
        <p className="text-xs text-ink-muted">Maximum of {PERSONALIZATION_MAX_FIELDS} fields.</p>
      )}

      {error ? <p className="text-xs text-brand-700">{error}</p> : null}
    </div>
  );
}
