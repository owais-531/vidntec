import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';

export default function StoreNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-card bg-white p-10 text-center">
      <div className="text-3xl text-brand-500">⚡</div>
      <h1 className="mt-3 text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        That product or page doesn’t exist or is no longer available.
      </p>
      <Link href="/products" className={buttonClasses('primary', 'md', 'mt-5')}>
        Browse the catalog
      </Link>
    </div>
  );
}
