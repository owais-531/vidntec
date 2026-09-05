/**
 * Canonical site identity — used for metadataBase, canonical URLs, the sitemap,
 * robots, JSON-LD and social cards. Override the URL per environment with
 * NEXT_PUBLIC_SITE_URL (e.g. a preview deployment).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vidntec.com'
).replace(/\/$/, '');

export const siteConfig = {
  name: 'VIDNTEC',
  url: SITE_URL,
  title: 'VIDNTEC — 3D-Printed Products, Made to Order',
  description:
    'VIDNTEC is an online store for precision 3D-printed products — functional and decorative prints made to order and shipped to your door. Cash on Delivery available in Pakistan.',
  tagline: 'Precision 3D-printed products, made to order.',
  /** Store currency for display / structured data. Charges are governed by StoreSettings in the DB. */
  currency: 'PKR',
} as const;

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
