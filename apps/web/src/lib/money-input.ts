/**
 * UI helpers for editing money. Amounts are stored as integer minor units
 * (paisa, ×100); PKR prices are entered and shown as whole rupees, so a trailing
 * ".00" is dropped on display and an integer-rupee string is accepted on input.
 */

export function centsToInput(cents: number): string {
  const s = (cents / 100).toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}

/** Returns integer minor units, or null if the string isn't valid money. */
export function inputToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[Rs₨$,\s]/gi, '');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}
