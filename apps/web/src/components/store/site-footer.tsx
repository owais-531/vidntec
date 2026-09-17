import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { whatsappUrl } from '@/lib/whatsapp';

const POLICY_LINKS = [
  { href: '/returns-and-refunds', label: 'Return & Refunds' },
  { href: '/shipping-policy', label: 'Shipping Policy' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink">{children}</p>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-paper-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-xs text-ink-muted sm:grid-cols-3">
        <div>
          <Logo className="h-4" />
          <p className="mt-2.5">3D-printed products, made to order.</p>
        </div>

        <div>
          <FooterHeading>Policies</FooterHeading>
          <nav className="flex flex-col gap-1.5">
            {POLICY_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <FooterHeading>Contact us</FooterHeading>
          <div className="flex flex-col gap-1.5">
            <a href="mailto:info@vidntec.com" className="hover:text-ink">
              info@vidntec.com
            </a>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              +92 317 5791001
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
