import { getCartCount } from '@/lib/cart/queries';
import { getSessionClaims } from '@/lib/auth';
import { listStorefrontCategories } from '@/lib/storefront/queries';
import { SiteHeader } from '@/components/store/site-header';
import { SiteFooter } from '@/components/store/site-footer';
import { CategorySidebar, CategorySidebarProvider } from '@/components/store/category-sidebar';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [cartCount, claims, categories] = await Promise.all([
    getCartCount(),
    getSessionClaims(),
    listStorefrontCategories(),
  ]);

  return (
    <CategorySidebarProvider>
      <div className="flex min-h-screen flex-col bg-paper-sunken">
        <SiteHeader cartCount={cartCount} authed={Boolean(claims)} />
        <CategorySidebar categories={categories} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
        <SiteFooter />
      </div>
    </CategorySidebarProvider>
  );
}
