/** Minimal RFC-4180 CSV writer for the manager exports. */

const PHONE_LIKE = /^[+-]?[\d\s()-]+$/;

/**
 * Neutralise spreadsheet formula injection: Excel/Sheets treat a cell that
 * starts with = + - @ (or tab/CR) as a formula. Customer-entered text (names,
 * addresses) flows into these files, so prefix such cells with an apostrophe.
 * Plain phone numbers ("+92 300 …") are left alone.
 */
function guard(text: string): string {
  if (/^[=@\t\r]/.test(text)) return `'${text}`;
  if (/^[+-]/.test(text) && !PHONE_LIKE.test(text)) return `'${text}`;
  return text;
}

const BOM = String.fromCharCode(0xfeff);

export type CsvCell = string | number | null | undefined;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? String(value) : guard(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 with BOM so Excel opens Urdu/accents correctly. CRLF line endings. */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(','));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Integer minor units (paisa) → rupees with 2 decimals, e.g. 149900 → "1499.00". */
export function money(minor: number): string {
  return (minor / 100).toFixed(2);
}
