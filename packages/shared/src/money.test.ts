import { describe, expect, it } from 'vitest';
import { formatMoney, lineTotal, sumCents, taxForSubtotal } from './money';

describe('money', () => {
  it('sums integer cents', () => {
    expect(sumCents([100, 250, 99])).toBe(449);
  });

  it('rejects non-integer cents', () => {
    expect(() => sumCents([12.5])).toThrow();
  });

  it('computes line totals', () => {
    expect(lineTotal(1299, 3)).toBe(3897);
    expect(() => lineTotal(1299, 0)).toThrow();
  });

  it('computes tax from basis points, rounding half up', () => {
    expect(taxForSubtotal(10_000, 875)).toBe(875);
    expect(taxForSubtotal(999, 875)).toBe(87); // 87.4125 -> 87
  });

  it('formats money', () => {
    expect(formatMoney(1299, 'usd', 'en-US')).toBe('$12.99');
  });

  it('formats PKR as whole rupees', () => {
    // Intl separates the symbol with a non-breaking space — normalise it.
    const norm = (s: string) => s.replace(/\s/g, ' ');
    expect(norm(formatMoney(240000))).toBe('Rs 2,400');
    expect(norm(formatMoney(240050))).toBe('Rs 2,401'); // rounds — retail is whole rupees
  });
});
