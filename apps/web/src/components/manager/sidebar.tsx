'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/logo';

const NAV = [
  { href: '/manager', label: 'Dashboard', icon: '📈', exact: true },
  { href: '/manager/orders', label: 'Orders', icon: '🧾' },
  { href: '/manager/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/manager/exports', label: 'Exports', icon: '⬇️' },
];

export function ManagerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-paper-line bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-paper-line px-5">
        <Link href="/manager" className="flex items-center">
          <Logo className="h-5" />
        </Link>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Manager
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
