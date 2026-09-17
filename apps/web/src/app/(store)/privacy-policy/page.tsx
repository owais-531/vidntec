import type { Metadata } from 'next';
import { LegalContent } from '@/components/store/legal-content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalContent title="Privacy Policy" lastUpdated="17 September 2026">
      <h2>Information we collect</h2>
      <p>When you shop with us or create an account, we collect:</p>
      <ul>
        <li>Your name, email address, phone number, and shipping address</li>
        <li>Your order history and what you ordered, including any personalization you add</li>
        <li>Your account password, stored securely hashed — we never store it in plain text</li>
        <li>Photos you choose to upload with a product review</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use this information to process and deliver your orders, send order and account
        emails (confirmations, shipping updates, password resets), respond to support requests,
        and improve the products we offer.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a small number of essential cookies to keep you signed in and to remember your
        cart between visits. We also use Google Analytics to understand how visitors use the
        site, which sets its own analytics cookies.
      </p>

      <h2>Who we share data with</h2>
      <p>We share the minimum needed with the services that help us run VIDNTEC:</p>
      <ul>
        <li>Our courier partners, to deliver your order</li>
        <li>Cloudinary, to host product and review images</li>
        <li>Resend, to send transactional emails</li>
        <li>Google Analytics, for anonymized site-traffic insights</li>
      </ul>
      <p>We never sell your personal information to anyone.</p>

      <h2>Your rights</h2>
      <p>
        You can ask us to access, correct, or delete your personal data at any time by emailing{' '}
        <strong>info@vidntec.com</strong>.
      </p>
    </LegalContent>
  );
}
