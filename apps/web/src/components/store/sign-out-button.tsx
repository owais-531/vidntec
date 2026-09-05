'use client';

import { useTransition } from 'react';
import { logoutAction } from '@/lib/actions/auth';

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="flex items-center gap-1.5 text-sm hover:opacity-90 disabled:opacity-50"
    >
      <span aria-hidden>🚪</span>
      <span className="hidden sm:inline">{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
