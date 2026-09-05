'use client';

import { useState, useTransition } from 'react';
import { Button, type ButtonProps } from './button';
import { toast } from './toast';

/**
 * Button that opens a small inline confirm, then runs `action`.
 * `action` returns `{ ok: true } | { ok: false, error: string }`.
 */
export function ConfirmButton({
  action,
  confirmLabel = 'Confirm',
  message = 'Are you sure?',
  successMessage,
  children,
  variant = 'danger',
  size = 'sm',
  ...rest
}: {
  action: () => Promise<{ ok: boolean; error?: string }>;
  confirmLabel?: string;
  message?: string;
  successMessage?: string;
} & Omit<ButtonProps, 'onClick' | 'action'>) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant={variant} size={size} onClick={() => setOpen(true)} {...rest}>
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-card bg-brand-50 px-2 py-1 text-xs text-brand-700">
      <span>{message}</span>
      <button
        type="button"
        disabled={pending}
        className="font-semibold underline underline-offset-2 disabled:opacity-50"
        onClick={() =>
          startTransition(async () => {
            const res = await action();
            if (res.ok) {
              if (successMessage) toast(successMessage);
            } else {
              toast(res.error ?? 'Something went wrong', 'error');
            }
            setOpen(false);
          })
        }
      >
        {pending ? '…' : confirmLabel}
      </button>
      <button type="button" className="text-ink-muted" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </span>
  );
}
