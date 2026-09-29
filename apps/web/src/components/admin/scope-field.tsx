'use client';

import { useState, useTransition } from 'react';
import type { ScopeDraftRequest } from '@vidntec/shared';
import { draftScopeAction } from '@/lib/actions/catalog';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { FieldError, Input, Label } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { RichTextEditor } from '@/components/admin/rich-text-editor';

type DraftContext = Omit<ScopeDraftRequest, 'instructions'>;

/**
 * Optional rich-text "Scope" section (technical detail for engineered products).
 * Collapsed behind an "Add scope" button until used; starts open when the product
 * already has one. "Draft with AI" writes it from the form's current (unsaved)
 * details — the admin reviews/edits it before saving. Shared by the new/edit
 * product forms.
 */
export function ScopeField({
  value,
  onChange,
  getDraftContext,
  error,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Read at click time so the draft uses whatever is in the form right now. */
  getDraftContext: () => DraftContext;
  error?: string;
}) {
  const [open, setOpen] = useState(value !== '');
  const [notes, setNotes] = useState('');
  const [drafting, startDrafting] = useTransition();

  const draft = async (): Promise<{ ok: boolean; error?: string }> => {
    const context = getDraftContext();
    if (!context.title.trim()) return { ok: false, error: 'Add a product title first.' };
    const res = await draftScopeAction({
      ...context,
      ...(notes.trim() ? { instructions: notes.trim() } : {}),
    });
    if (!res.ok) return res;
    onChange(res.data.scope);
    return { ok: true };
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand-600 hover:underline"
      >
        + Add scope
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor="scope">Scope</Label>
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
          className="text-xs text-ink-muted hover:text-brand-600"
        >
          Remove
        </button>
      </div>
      <RichTextEditor id="scope" value={value} onChange={onChange} underline />
      {error ? null : (
        <p className="mt-1 text-xs text-ink-muted">
          Technical details and scope, shown under its own heading on the product page.
        </p>
      )}
      <FieldError>{error}</FieldError>

      <div className="mt-3 rounded-card border border-dashed border-paper-line p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Notes for the AI (optional)"
            placeholder="Notes for the AI (optional), e.g. focus on load capacity"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
          />
          {value ? (
            <ConfirmButton
              variant="secondary"
              message="Replace the current scope?"
              confirmLabel="Replace"
              successMessage="Scope drafted — review it before saving"
              action={draft}
              className="h-10 shrink-0"
            >
              ✨ Redraft with AI
            </ConfirmButton>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="h-10 shrink-0"
              disabled={drafting}
              onClick={() =>
                startDrafting(async () => {
                  const res = await draft();
                  if (res.ok) toast('Scope drafted — review it before saving');
                  else toast(res.error ?? 'Something went wrong', 'error');
                })
              }
            >
              {drafting ? 'Drafting…' : '✨ Draft with AI'}
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">
          Uses the title, description, category, details and variants above. AI can get things wrong
          — check every fact before saving.
        </p>
      </div>
    </div>
  );
}
