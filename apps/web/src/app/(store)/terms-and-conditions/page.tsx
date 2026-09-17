import type { Metadata } from 'next';
import { LegalContent } from '@/components/store/legal-content';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  alternates: { canonical: '/terms-and-conditions' },
};

export default function TermsAndConditionsPage() {
  return (
    <LegalContent title="Terms & Conditions" lastUpdated="17 September 2026">
      <h2>Using our site</h2>
      <p>
        By placing an order or creating an account on VIDNTEC, you agree to these terms. Please
        read them along with our{' '}
        <a href="/privacy-policy" className="text-brand-500 underline">
          Privacy Policy
        </a>
        ,{' '}
        <a href="/shipping-policy" className="text-brand-500 underline">
          Shipping Policy
        </a>
        , and{' '}
        <a href="/returns-and-refunds" className="text-brand-500 underline">
          Return &amp; Refunds Policy
        </a>
        .
      </p>

      <h2>Orders &amp; pricing</h2>
      <p>
        All prices are shown in Pakistani Rupees (PKR) and can change without notice. Placing an
        order is an offer to buy — we confirm it once we accept it. Since every item is printed
        to order, we may occasionally cancel and fully refund an order we&apos;re unable to fulfil.
      </p>

      <h2>Personalization</h2>
      <p>
        If a product lets you add a name or choose a color, you&apos;re responsible for what you
        submit. We may decline to print anything offensive, unlawful, or that infringes someone
        else&apos;s rights.
      </p>

      <h2>Accounts</h2>
      <p>
        You&apos;re responsible for keeping your account password confidential and for all activity
        under your account. Let us know right away if you think someone else has access to it.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The VIDNTEC name, logo, and product designs are our property and may not be reproduced or
        resold without our permission.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        We aim for every order to arrive as described, but to the extent permitted by law, VIDNTEC
        isn&apos;t liable for indirect or incidental damages arising from the use of our products or
        site.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Pakistan.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email us at <strong>info@vidntec.com</strong>.
      </p>
    </LegalContent>
  );
}
