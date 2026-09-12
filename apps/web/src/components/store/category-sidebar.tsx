'use client';

import { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import type { PublicCategory } from '@vidntec/shared';

const SidebarContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(
  null,
);

export function CategorySidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>;
}

export function CategorySidebarToggle({ className = '' }: { className?: string }) {
  const ctx = useContext(SidebarContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      aria-label="Toggle categories menu"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card hover:bg-white/10 ${className}`}
    >
      <svg
        aria-hidden
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

export function CategorySidebar({ categories }: { categories: PublicCategory[] }) {
  const ctx = useContext(SidebarContext);
  if (!ctx) return null;
  const { open, setOpen } = ctx;

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-label="Categories"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] transform flex-col bg-white shadow-pop transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-paper-line px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">Categories</h2>
          <button
            type="button"
            aria-label="Close categories menu"
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center text-ink-muted hover:text-ink"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
        <nav className="flex flex-col overflow-y-auto py-2">
          <Link
            href="/categories"
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-sunken"
          >
            All categories
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-sm text-ink-soft hover:bg-paper-sunken hover:text-ink"
            >
              {c.name}
            </Link>
          ))}
          {categories.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-ink-muted">No categories yet.</p>
          ) : null}
        </nav>
      </aside>
    </>
  );
}
