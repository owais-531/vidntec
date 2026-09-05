import { cn } from '@/lib/cn';
import type { OrderStatus } from '@vidntec/shared';

const TONES: Record<OrderStatus, string> = {
  pending: 'bg-paper-sunken text-ink-muted',
  confirmed: 'bg-accent-100 text-accent-600',
  fulfilled: 'bg-accent-100 text-accent-600',
  delivered: 'bg-accent-600 text-white',
  cancelled: 'bg-paper-sunken text-ink-muted',
  refunded: 'bg-brand-50 text-brand-600',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize',
        TONES[status],
      )}
    >
      {status}
    </span>
  );
}
