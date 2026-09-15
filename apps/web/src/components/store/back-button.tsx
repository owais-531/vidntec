'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-3 flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
    >
      ← Back
    </button>
  );
}
