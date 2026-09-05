'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/logo';

const NAV = [
  { href: '/admin/products', label: 'Products', icon: '📦' },
  { href: '/admin/inventory', label: 'Inventory', icon: '📊' },
  { href: '/admin/orders', label: 'Orders', icon: '🧾' },
  { href: '/admin/shipping', label: 'Shipping', icon: '🚚' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-paper-line bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-paper-line px-5">
        <Link href="/admin/products" className="flex items-center">
          <Logo className="h-5" />
        </Link>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Admin
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-ink-soft hover:bg-paper-sunken hover:text-ink',
              )}
            >
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
