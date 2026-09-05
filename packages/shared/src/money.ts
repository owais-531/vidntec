/**
 * Money helpers. Everything in vidntec is stored and computed as integer cents.
 * Never introduce floats into pricing math.
 */

/** A non-negative integer number of cents. */
export type Cents = number;

export function assertCents(value: number, label = 'amount'): asserts value is Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer number of cents, got ${value}`);
  }
  if (value < 0) {
    throw new Error(`${label} must not be negative, got ${value}`);
  }
}

/** Sum a list of cent amounts, asserting each is a valid integer. */
export function sumCents(amounts: readonly number[]): Cents {
  return amounts.reduce((total, amount) => {
    assertCents(amount, 'line amount');
    return total + amount;
  }, 0);
}

/** unitPrice (cents) * quantity, with validation. */
export function lineTotal(unitPriceCents: number, quantity: number): Cents {
  assertCents(unitPriceCents, 'unit price');
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`quantity must be a positive integer, got ${quantity}`);
  }
  return unitPriceCents * quantity;
}

/**
 * Apply a tax rate expressed in basis points (875 = 8.75%) to a cent amount.
 * Rounds half-up to the nearest cent. This is the single seam to replace with
 * Stripe Tax later — callers only ever see cents in, cents out.
 */
export function taxForSubtotal(subtotalCents: number, taxRateBps: number): Cents {
  assertCents(subtotalCents, 'subtotal');
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0) {
    throw new Error(`taxRateBps must be a non-negative integer, got ${taxRateBps}`);
  }
  return Math.round((subtotalCents * taxRateBps) / 10_000);
}

/**
 * Currencies we display without a fractional part. Amounts are still *stored* as
 * integer minor units (×100) everywhere — this only affects rendering. PKR retail
 * prices are always whole rupees.
 */
const ZERO_DECIMAL_DISPLAY = new Set(['pkr']);

/** Format minor units for display, e.g. formatMoney(240000, 'pkr') -> "Rs 2,400". */
export function formatMoney(minorUnits: number, currency = 'pkr', locale = 'en-PK'): string {
  const zeroDecimal = ZERO_DECIMAL_DISPLAY.has(currency.toLowerCase());
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    ...(zeroDecimal ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(minorUnits / 100);
}
