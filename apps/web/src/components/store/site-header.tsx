import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '@/components/ui/logo';
import { SearchForm } from './search-form';
import { SignOutButton } from './sign-out-button';
import { CategorySidebarToggle } from './category-sidebar';
import { GiftMarqueeStrip } from './gift-marquee-strip';

export function SiteHeader({
  cartCount = 0,
  authed = false,
}: {
  cartCount?: number;
  authed?: boolean;
}) {
  return (
    <header>
      {/* utility strip */}
      <div className="bg-brand-strip text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs">
          <span className="hidden opacity-90 sm:block">
            Welcome to VIDNTEC — 3D-printed products, made to order.
          </span>
          <nav className="flex items-center gap-4">
            <Link href="/track" className="opacity-90 hover:opacity-100">
              Track order
            </Link>
            <Link href="/request-refund" className="opacity-90 hover:opacity-100">
              Request a refund
            </Link>
          </nav>
        </div>
      </div>

      {/* main bar */}
      <div className="bg-brand-500 text-white">
        <div className="relative">
          <CategorySidebarToggle className="absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-4" />
          <div className="mx-auto flex max-w-6xl items-center gap-4 py-3.5 pl-14 pr-4 sm:pl-16 xl:px-4">
            <Link href="/" className="flex shrink-0 items-center">
              <Logo onDark className="text-2xl sm:text-3xl" />
            </Link>

            <div className="hidden flex-1 md:flex">
              <Suspense fallback={<div className="h-10 flex-1 rounded-card bg-white/20" />}>
                <SearchForm />
              </Suspense>
            </div>

            <nav className="ml-auto flex items-center gap-5 text-sm">
              <Link
                href={authed ? '/account/orders' : '/login'}
                className="flex items-center gap-1.5 hover:opacity-90"
              >
                <span aria-hidden>👤</span>
                <span className="hidden sm:inline">{authed ? 'Orders' : 'Account'}</span>
              </Link>
              {authed ? <SignOutButton /> : null}
              <Link href="/cart" className="flex items-center gap-1.5 hover:opacity-90">
                <span aria-hidden>🛒</span>
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 ? (
                  <span className="rounded-full bg-white px-1.5 text-xs font-bold text-brand-600">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </nav>
          </div>
        </div>

        {/* mobile search */}
        <div className="px-4 pb-3 md:hidden">
          <Suspense fallback={<div className="h-10 rounded-card bg-white/20" />}>
            <SearchForm />
          </Suspense>
        </div>
      </div>

      <GiftMarqueeStrip />
    </header>
  );
}
