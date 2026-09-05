/**
 * Order timestamps are always shown in Pakistan time (Asia/Karachi), so the
 * dev machine, the Railway server, admins and customers all read the same clock
 * no matter where they are.
 */
const ORDER_TZ = 'Asia/Karachi';

/** e.g. "3 Sept 2026, 4:32 pm" */
export function formatOrderDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ORDER_TZ,
  }).format(new Date(value));
}

/** Date only — e.g. "3 Sept 2026" */
export function formatOrderDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ORDER_TZ,
  }).format(new Date(value));
}
