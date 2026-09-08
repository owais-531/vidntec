import Image from 'next/image';
import { cn } from '@/lib/cn';
import logo from './logo.png';
import whiteLogo from './white-logo.png';

/**
 * The VIDNTEC wordmark. Pass a height via `className` (e.g. `h-7 w-auto`).
 * `onDark` swaps in the white wordmark asset for use on the red header.
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
  return (
    <Image
      src={onDark ? whiteLogo : logo}
      alt="VIDNTEC"
      priority={priority}
      className={cn('w-auto', className)}
    />
  );
}
