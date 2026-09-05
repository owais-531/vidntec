import Image from 'next/image';
import { cn } from '@/lib/cn';
import logo from './logo.png';

/**
 * The VIDNTEC wordmark. Pass a height via `className` (e.g. `h-7 w-auto`).
 * `onDark` knocks the mark out to solid white for the red header.
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
      src={logo}
      alt="VIDNTEC"
      priority={priority}
      className={cn('w-auto', onDark && 'brightness-0 invert', className)}
    />
  );
}
