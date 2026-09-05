import type { Metadata } from 'next';
import { SectionHeading } from '@/components/store/section-heading';
import { TrackOrderForm } from '@/components/store/track-order-form';

export const metadata: Metadata = { title: 'Track your order' };

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-md">
      <SectionHeading title="Track your order" />
      <p className="mb-5 text-sm text-ink-soft">
        No account needed. Enter your order number (or the tracking number once your order has
        shipped) and the email you used at checkout.
      </p>
      <TrackOrderForm />
    </div>
  );
}
