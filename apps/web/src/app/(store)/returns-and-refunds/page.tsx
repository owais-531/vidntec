import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalContent } from '@/components/store/legal-content';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Return & Refunds Policy',
  alternates: { canonical: '/returns-and-refunds' },
};

export default function ReturnsAndRefundsPage() {
  return (
    <LegalContent title="Return & Refunds Policy" lastUpdated="17 September 2026">
      <h2>Made-to-order products</h2>
      <p>
        Every item on VIDNTEC is 3D-printed fresh after you place your order, so we&apos;re only able
        to accept returns in the cases below rather than for a general change of mind.
      </p>

      <h2>Damaged or defective items</h2>
      <p>
        If your order arrives damaged, defective, or different from what you ordered, contact us
        within <strong>5 days of receiving your order</strong> with your order number and photos
        of the item. We&apos;ll arrange a free replacement or a full refund, whichever you prefer.
      </p>

      <h2>Personalized items</h2>
      <p>
        Products customized with a printed name or a chosen color cannot be returned or refunded
        once printed, unless they arrive damaged or defective — since these are made specifically
        for you and can&apos;t be resold.
      </p>

      <h2>How refunds are issued</h2>
      <p>
        Since orders are paid by Cash on Delivery, approved refunds are sent by bank transfer or
        mobile wallet (JazzCash/Easypaisa) to the details you provide us. Refunds are processed
        within 5–7 business days of approval.
      </p>

      <h2>How to request a return or refund</h2>
      <p>
        Fill out our refund request form with your order details, or message us on WhatsApp or
        email <strong>info@vidntec.com</strong>. You can find your order number by tracking your
        order.
      </p>
      <p>
        <Link href="/request-refund" className={buttonClasses('primary', 'md')}>
          Request a refund
        </Link>
      </p>
    </LegalContent>
  );
}
