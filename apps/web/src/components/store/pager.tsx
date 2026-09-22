import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export function Pager({
  page,
  lastPage,
  hrefFor,
  className = 'mt-8',
}: {
  page: number;
  lastPage: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (lastPage <= 1) return null;
  return (
    <div className={cn('flex items-center justify-center gap-3 text-xs text-ink-muted', className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClasses('secondary', 'sm')}>
          ‹ Previous
        </Link>
      ) : null}
      <span>
        Page {page} of {lastPage}
      </span>
      {page < lastPage ? (
        <Link href={hrefFor(page + 1)} className={buttonClasses('secondary', 'sm')}>
          Next ›
        </Link>
      ) : null}
    </div>
  );
}
