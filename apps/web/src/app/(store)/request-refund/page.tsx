import type { Metadata } from 'next';
import { SectionHeading } from '@/components/store/section-heading';
import { RefundRequestForm } from '@/components/store/refund-request-form';

export const metadata: Metadata = { title: 'Request a Refund' };

export default function RequestRefundPage() {
  return (
    <div className="mx-auto max-w-md">
      <SectionHeading title="Request a refund" />
      <p className="mb-5 text-sm text-ink-soft">
        Fill this out and we&apos;ll follow up by email or WhatsApp. See our{' '}
        <a href="/returns-and-refunds" className="text-brand-500 underline">
          Return &amp; Refunds Policy
        </a>{' '}
        for what qualifies.
      </p>
      <RefundRequestForm />
    </div>
  );
}
