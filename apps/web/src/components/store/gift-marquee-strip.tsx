import Link from 'next/link';
import { GIFT_THRESHOLD_CENTS, formatMoney } from '@vidntec/shared';

// Repeated enough times per half that the row always spans wider than the
// viewport (even ultra-wide screens) — otherwise the two halves are narrower
// than the strip and there's a long text-empty gap before the loop repeats.
const REPEAT = 8;

function MarqueeGroup() {
  const text = `🎁 Free mini gift (figurines, keychains & more) on orders above ${formatMoney(GIFT_THRESHOLD_CENTS)} — shop now`;
  return (
    <span className="flex shrink-0">
      {Array.from({ length: REPEAT }, (_, i) => (
        <span key={i} className="mx-8 whitespace-nowrap">
          {text}
        </span>
      ))}
    </span>
  );
}

export function GiftMarqueeStrip() {
  return (
    <Link
      href="/products"
      className="group block overflow-hidden rounded-card bg-brand-strip py-2.5 text-xs font-medium text-white hover:opacity-90 sm:text-sm"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <MarqueeGroup />
        <MarqueeGroup />
      </div>
    </Link>
  );
}
