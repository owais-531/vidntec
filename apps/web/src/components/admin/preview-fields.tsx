'use client';

import { DEFAULT_PREVIEW_PROMPT, PREVIEW_MAX_LIMIT, PREVIEW_PROMPT_MAX_CHARS } from '@vidntec/shared';
import { Field, Input, Textarea } from '@/components/ui/field';

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
  nameEnabled,
  referenceCount,
  errors,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  limit: string;
  onLimitChange: (v: string) => void;
  nameEnabled: boolean;
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

      {enabled && !nameEnabled ? (
        <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
          The preview reads the customer’s name, so “Let customers add a printed name” above must be on too.
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

          <Field
            label="Instructions for the AI"
            htmlFor="preview-prompt"
            error={errors?.prompt}
            hint="Leave empty to use the standard instructions. Blanks filled in for each customer: {name} (their text), {initial} (its first letter), {colour} (the selected variant’s colour)."
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
