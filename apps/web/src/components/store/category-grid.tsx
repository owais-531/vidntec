import Link from 'next/link';
import type { PublicCategory } from '@vidntec/shared';

/** Storefront category tiles — colour + optional emoji, linking to the category page. */
export function CategoryGrid({ categories }: { categories: PublicCategory[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/categories/${c.slug}`}
          className="group flex items-center justify-between gap-2 rounded-card p-4 transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: c.color }}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {c.emoji ? (
              <span aria-hidden className="shrink-0 text-xl">
                {c.emoji}
              </span>
            ) : null}
            <span className="truncate font-semibold text-ink">{c.name}</span>
          </span>
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70 text-ink transition-transform group-hover:translate-x-0.5"
          >
            ›
          </span>
        </Link>
      ))}
    </div>
  );
}
