import { getCart } from '@/lib/cart/queries';
import { getSessionClaims } from '@/lib/auth';
import { listStorefrontCategories } from '@/lib/storefront/queries';
import { SiteHeader } from '@/components/store/site-header';
import { SiteFooter } from '@/components/store/site-footer';
import { CategorySidebar, CategorySidebarProvider } from '@/components/store/category-sidebar';
import { CartDrawer, CartDrawerProvider } from '@/components/store/cart-drawer';
import { WhatsappFloatButton } from '@/components/store/whatsapp-float-button';
import { ChatWidget } from '@/components/store/chat-widget';
import { Toaster } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [cart, claims, categories] = await Promise.all([
    getCart(),
    getSessionClaims(),
    listStorefrontCategories(),
  ]);

  return (
    <CategorySidebarProvider>
      <CartDrawerProvider cart={cart}>
        <div className="flex min-h-screen flex-col bg-paper-sunken">
          <SiteHeader cartCount={cart.itemCount} authed={Boolean(claims)} />
          <CategorySidebar categories={categories} />
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
          <SiteFooter />
        </div>
        <Toaster />
        <WhatsappFloatButton />
        <ChatWidget />
        <CartDrawer />
      </CartDrawerProvider>
    </CategorySidebarProvider>
  );
}
