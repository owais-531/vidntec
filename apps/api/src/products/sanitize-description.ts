import sanitizeHtml from 'sanitize-html';

/**
 * Defense-in-depth: the admin editor's schema already limits output to these
 * tags, but the API must not trust that only that editor ever writes here —
 * this is rendered unescaped on the public storefront.
 */
export function sanitizeDescription(html: string): string {
  const cleaned = sanitizeHtml(html, {
    allowedTags: ['p', 'strong', 'em', 'ul', 'li', 'br'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
  // A Tiptap-empty doc serializes to markup like "<p></p>" — collapse any
  // tags-but-no-text result to '' so the "no description" checks elsewhere
  // (storefront render gate, search) keep working on a plain empty string.
  const isBlank = cleaned.replace(/<[^>]*>/g, '').trim().length === 0;
  return isBlank ? '' : cleaned;
}
