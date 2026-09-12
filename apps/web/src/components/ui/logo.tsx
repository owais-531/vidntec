import Image from 'next/image';
import { cn } from '@/lib/cn';
import logo from './logo.png';

/**
 * The VIDNTEC wordmark. Pass a height via `className` (e.g. `h-7 w-auto`).
 * `onDark` renders a plain white text wordmark for use on the red header
 * (a text size class, e.g. `text-xl`, not a height class).
 */
export function Logo({
  className,
  onDark = false,
  priority = false,
}: {
  className?: string;
  onDark?: boolean;
  priority?: boolean;
}) {
  if (onDark) {
    return <span className={cn('font-bold tracking-wide text-white', className)}>VIDNTEC</span>;
  }
  return (
    <Image
      src={logo}
      alt="VIDNTEC"
      priority={priority}
      className={cn('w-auto', className)}
    />
  );
}
