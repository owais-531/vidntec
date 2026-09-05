import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-paper-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-4" />
          <span>· 3D-printed products, made to order.</span>
        </div>
        <div className="flex gap-4">
          <Link href="/products" className="hover:text-ink">
            Catalog
          </Link>
          <Link href="/login" className="hover:text-ink">
            Account
          </Link>
        </div>
      </div>
    </footer>
  );
}
