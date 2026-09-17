import { GIFT_THRESHOLD_CENTS, formatMoney } from '@vidntec/shared';

export function GiftProgressBanner({ subtotal }: { subtotal: number }) {
  const qualifies = subtotal >= GIFT_THRESHOLD_CENTS;

  return (
    <p className="mb-4 rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
      {qualifies
        ? `🎁 You've unlocked a free mini gift with this order!`
        : `🎁 Add ${formatMoney(GIFT_THRESHOLD_CENTS - subtotal)} more to get a free mini gift.`}
    </p>
  );
}
