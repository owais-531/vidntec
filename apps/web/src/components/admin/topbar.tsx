'use client';

import { useTransition } from 'react';
import { logoutAction } from '@/lib/actions/auth';

export function Topbar({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-4 border-b border-paper-line bg-white px-6">
      <span className="text-xs text-ink-muted">{email}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => logoutAction())}
        className="rounded-card border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-sunken disabled:opacity-50"
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </header>
  );
}
