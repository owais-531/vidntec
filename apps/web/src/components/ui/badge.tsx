import { cn } from '@/lib/cn';
import type { ProductStatus } from '@vidntec/shared';

const TONES = {
  green: 'bg-accent-100 text-accent-600',
  grey: 'bg-paper-sunken text-ink-muted',
  red: 'bg-brand-50 text-brand-600',
} as const;

export function Badge({
  tone = 'grey',
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  return <Badge tone={status === 'active' ? 'green' : 'grey'}>{status}</Badge>;
}
