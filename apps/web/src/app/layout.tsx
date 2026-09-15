import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { siteConfig, SITE_URL } from '@/lib/site';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: siteConfig.title, template: '%s · VIDNTEC' },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    url: SITE_URL,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

// Read directly (not via lib/env.ts's schema, which eagerly validates unrelated
// required vars at module scope and isn't safe to import from the root layout —
// it broke the build for every route, including Next's auto-generated /_not-found).
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans">{children}</body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
