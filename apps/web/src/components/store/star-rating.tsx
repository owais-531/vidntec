'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

const SIZES = { xs: 12, sm: 14, md: 20 } as const;

function Star({ filled, size }: { filled: number; size: number }) {
  // `filled` is 0-1 — lets a read-only average render a partial star.
  // useId (not Math.random) keeps server/client markup identical for hydration.
  const id = `star-clip-${useId()}`;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={20 * filled} height="20" />
        </clipPath>
      </defs>
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.74 1-5.8L1.58 7.6l5.82-.85L10 1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-brand-500"
      />
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.74 1-5.8L1.58 7.6l5.82-.85L10 1.5z"
        fill="currentColor"
        clipPath={`url(#${id})`}
        className="text-brand-500"
      />
    </svg>
  );
}

/**
 * Read-only mode renders `value` (supports fractional fill, e.g. 4.3) for the
 * product card / PDP header. Interactive mode is a 1-5 click/hover picker for
 * the review form.
 */
export function StarRating({
  value,
  size = 'md',
  interactive = false,
  onChange,
  className,
}: {
  value: number | null;
  size?: keyof typeof SIZES;
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const px = SIZES[size];
  const shown = interactive ? (hover ?? value ?? 0) : (value ?? 0);

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Rating' : value != null ? `Rated ${value} out of 5` : 'No rating yet'}
      onMouseLeave={interactive ? () => setHover(null) : undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = Math.max(0, Math.min(1, shown - (n - 1)));
        if (!interactive) return <Star key={n} filled={filled} size={px} />;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange?.(n)}
            className="p-0.5"
          >
            <Star filled={filled} size={px} />
          </button>
        );
      })}
    </div>
  );
}
