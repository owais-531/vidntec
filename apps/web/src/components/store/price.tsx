import { formatMoney } from '@vidntec/shared';
import { cn } from '@/lib/cn';

function range(a: number, b: number): string {
  return a === b ? formatMoney(a) : `${formatMoney(a)} – ${formatMoney(b)}`;
}

export function Price({
  min,
  max,
  originalMin,
  originalMax,
  onSale = false,
  className,
}: {
  min: number;
  max: number;
  originalMin?: number;
  originalMax?: number;
  onSale?: boolean;
  className?: string;
}) {
  if (onSale && originalMin != null && originalMax != null) {
    return (
      <span className={cn('inline-flex flex-wrap items-baseline gap-1.5', className)}>
        <span className="font-semibold text-brand-500">{range(min, max)}</span>
        <span className="text-[0.8em] text-ink-muted line-through">
          {range(originalMin, originalMax)}
        </span>
      </span>
    );
  }
  return (
    <span className={cn('font-semibold text-brand-500', className)}>{range(min, max)}</span>
  );
}
