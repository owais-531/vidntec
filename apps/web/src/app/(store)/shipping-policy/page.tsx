import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalContent } from '@/components/store/legal-content';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  alternates: { canonical: '/shipping-policy' },
};

export default function ShippingPolicyPage() {
  return (
    <LegalContent title="Shipping Policy" lastUpdated="17 September 2026">
      <h2>Where we ship</h2>
      <p>
        We currently ship anywhere within Pakistan via TCS. We don&apos;t offer international
        shipping yet.
      </p>

      <h2>Processing time</h2>
      <p>
        Every product is 3D-printed to order rather than pulled from a warehouse shelf, so please
        allow <strong>2–4 business days</strong> to print and pack your order before it ships.
        Personalized items may take slightly longer.
      </p>

      <h2>Shipping rates &amp; delivery time</h2>
      <ul>
        <li>
          <strong>Standard (3–5 days)</strong> — Rs 200, free on orders above Rs 5,000.
        </li>
        <li>
          <strong>Urgent (1–2 days)</strong> — Rs 500.
        </li>
      </ul>
      <p>Delivery times can vary a little depending on your city and the courier&apos;s schedule.</p>

      <h2>Cash on Delivery</h2>
      <p>
        All orders are currently Cash on Delivery — you pay the courier when your order arrives.
      </p>

      <h2>Tracking your order</h2>
      <p>
        Once your order ships, you&apos;ll get a tracking number by email. You can also look up your
        order anytime on our <strong>Track order</strong> page.
      </p>
      <p>
        <Link href="/track" className={buttonClasses('primary', 'md')}>
          Track order
        </Link>
      </p>
    </LegalContent>
  );
}
