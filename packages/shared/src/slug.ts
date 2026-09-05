const DIACRITICS = /[̀-ͯ]/g;
const NON_ALNUM = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

/** Turn a product title into a URL-safe kebab-case slug. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_ALNUM, '-')
    .replace(EDGE_DASHES, '')
    .slice(0, 120)
    .replace(EDGE_DASHES, '');
}
