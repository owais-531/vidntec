/** Store-local time. Pakistan has no DST, so a fixed UTC+5 offset is exact. */
export const STORE_TZ = 'Asia/Karachi';
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC instant of 00:00 store-local on the given store-local calendar day. */
export function startOfStoreDay(date: Date): Date {
  const local = new Date(date.getTime() + OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - OFFSET_MS);
}

export function parseStoreDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) - OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** `YYYY-MM-DD HH:mm` in store time — for CSV cells. */
export function formatStoreDateTime(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}
