'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

type Toast = { id: number; message: string; tone: 'success' | 'error' };

const listeners = new Set<(t: Toast) => void>();
let counter = 0;

export function toast(message: string, tone: 'success' | 'error' = 'success') {
  const t: Toast = { id: ++counter, message, tone };
  listeners.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto min-w-56 rounded-card px-4 py-3 text-sm font-medium text-white shadow-pop',
            t.tone === 'success' ? 'bg-ink' : 'bg-brand-600',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
