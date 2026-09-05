/** Strips HTML tags for plain-text contexts (meta description, JSON-LD). Not a sanitizer — input is already server-sanitized HTML. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
