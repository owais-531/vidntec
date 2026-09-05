import { getCartCount } from '@/lib/cart/queries';
import { getSessionClaims } from '@/lib/auth';
import { SiteHeader } from '@/components/store/site-header';
import { SiteFooter } from '@/components/store/site-footer';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [cartCount, claims] = await Promise.all([getCartCount(), getSessionClaims()]);

  return (
    <div className="flex min-h-screen flex-col bg-paper-sunken">
      <SiteHeader cartCount={cartCount} authed={Boolean(claims)} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
      <SiteFooter />
    </div>
  );
}
