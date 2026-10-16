'use client';

import { DEFAULT_PREVIEW_PROMPT, PREVIEW_MAX_LIMIT, PREVIEW_PROMPT_MAX_CHARS } from '@vidntec/shared';
import { Field, Input, Select, Textarea } from '@/components/ui/field';

/** A personalization field the preview can read, as currently edited in the form. */
export interface PreviewFieldOption {
  id: string;
  label: string;
}

const nameOf = (f: PreviewFieldOption) => f.label.trim() || '(unnamed field)';

/**
 * Admin controls for the AI "preview with your name" feature on a product.
 * The photos it works from live in the separate reference-photos card below
 * (they need a saved product to upload against), so this only shows a reminder.
 */
export function PreviewFields({
  enabled,
  onEnabledChange,
  prompt,
  onPromptChange,
  limit,
  onLimitChange,
  textFields,
  dropdownFields,
  nameFieldId,
  onNameFieldChange,
  initialFieldId,
  onInitialFieldChange,
  colourFieldId,
  onColourFieldChange,
  referenceCount,
  errors,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  limit: string;
  onLimitChange: (v: string) => void;
  /** Text / dropdown personalization fields in the form right now (unsaved edits included). */
  textFields: PreviewFieldOption[];
  dropdownFields: PreviewFieldOption[];
  nameFieldId: string;
  onNameFieldChange: (id: string) => void;
  initialFieldId: string;
  onInitialFieldChange: (id: string) => void;
  colourFieldId: string;
  onColourFieldChange: (id: string) => void;
  referenceCount: number;
  errors?: { enabled?: string; prompt?: string; limit?: string };
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">AI preview</h2>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="accent-brand-500"
        />
        Let customers preview their name on this product before ordering
      </label>
      {errors?.enabled ? <p className="text-xs text-brand-700">{errors.enabled}</p> : null}

      {enabled && textFields.length === 0 ? (
        <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
          The preview reads the customer’s name, so add a Text field (e.g. “Name”) in Personalization above.
        </p>
      ) : null}

      {enabled ? (
        <div className="space-y-3 pl-6">
          {referenceCount === 0 ? (
            <p className="rounded-card bg-paper-sunken px-3 py-2 text-xs text-ink-soft">
              No reference photos yet — upload at least one in “AI preview — reference photos” below,
              or the preview button will not work for customers.
            </p>
          ) : null}

          <div className="space-y-3 rounded-card border border-paper-line p-3">
            <p className="text-xs font-medium text-ink-soft">
              Which personalization fields does the preview read?
            </p>
            <Field label="Name (required)" htmlFor="preview-name-field">
              <Select
                id="preview-name-field"
                value={nameFieldId}
                onChange={(e) => onNameFieldChange(e.target.value)}
              >
                <option value="">— Choose the name field —</option>
                {textFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {nameOf(f)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Initial letter (optional)"
              htmlFor="preview-initial-field"
              hint="If the customer types their own initial here, it picks the reference photo and fills {initial}."
            >
              <Select
                id="preview-initial-field"
                value={initialFieldId}
                onChange={(e) => onInitialFieldChange(e.target.value)}
              >
                <option value="">— Use the first letter of the name —</option>
                {textFields
                  .filter((f) => f.id !== nameFieldId)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {nameOf(f)}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field
              label="Colour (optional)"
              htmlFor="preview-colour-field"
              hint="The swatch of the customer’s choice fills {colour}. Choices without a swatch fall back to the variant’s colour."
            >
              <Select
                id="preview-colour-field"
                value={colourFieldId}
                onChange={(e) => onColourFieldChange(e.target.value)}
              >
                <option value="">— Use the selected variant’s colour —</option>
                {dropdownFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {nameOf(f)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Instructions for the AI"
            htmlFor="preview-prompt"
            error={errors?.prompt}
            hint="Leave empty to use the standard instructions. Blanks filled in for each customer: {name} (their text), {initial} (its first letter), {colour} (the colour field’s swatch, else the selected variant’s colour)."
          >
            <Textarea
              id="preview-prompt"
              rows={8}
              maxLength={PREVIEW_PROMPT_MAX_CHARS}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={DEFAULT_PREVIEW_PROMPT}
            />
          </Field>

          <Field
            label="Previews per visitor per day"
            htmlFor="preview-limit"
            error={errors?.limit}
            hint={`Each preview is a paid image generation. 1–${PREVIEW_MAX_LIMIT}.`}
          >
            <Input
              id="preview-limit"
              inputMode="numeric"
              className="w-24"
              value={limit}
              onChange={(e) => onLimitChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
