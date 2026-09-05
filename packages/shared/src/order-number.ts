/** Human-facing order reference derived from the internal id. Display only. */
export function orderNumber(id: string): string {
  return id.slice(-8).toUpperCase();
}
