/** Shared, non-secret constants for the FE/BE contract. */

export const ROLES = ['customer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PRODUCT_STATUSES = ['draft', 'active'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** A product gallery item is either a still image or an inline-playable video. */
export const MEDIA_TYPES = ['image', 'video'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** Default accent colour for a category tile (design-system sage green). */
export const CATEGORY_DEFAULT_COLOR = '#dce9e2';

/** Suggested tile colours offered in the category admin colour picker. */
export const CATEGORY_TILE_COLORS = [
  '#dce9e2', // sage
  '#f4d7d8', // blush
  '#e3e0f4', // lilac
  '#fde9cf', // sand
  '#d7ecf4', // sky
  '#e8e4d9', // stone
] as const;

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'fulfilled',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['stripe', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Auth cookie names — referenced by both the API (set) and web middleware (read). */
export const ACCESS_TOKEN_COOKIE = 'vidntec_at';
export const REFRESH_TOKEN_COOKIE = 'vidntec_rt';

/** Guest-cart identifier cookie (holds the Cart id). httpOnly, not secret. */
export const CART_COOKIE = 'vidntec_cart';
export const CART_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** Token lifetimes. Access short-lived; refresh long-lived and rotated on each use. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour
export const EMAIL_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

/** JWT issuer/audience claims — asserted on both sign and verify. */
export const JWT_ISSUER = 'vidntec';
export const JWT_AUDIENCE = 'vidntec-app';

export const MAX_CART_ITEM_QUANTITY = 99;

/** Max characters for a customer's personalized text/name on a customizable product. */
export const CUSTOMIZATION_NAME_MAX_LENGTH = 40;

/** Max admin-defined text-color options for a customizable product. */
export const CUSTOMIZATION_MAX_COLOR_OPTIONS = 4;

/** Variants at or below this stock level are flagged in the admin inventory view. */
export const LOW_STOCK_THRESHOLD = 5;

/** Max characters for a product review's comment text. */
export const REVIEW_COMMENT_MAX_LENGTH = 1000;

/** Max characters for the free-text reviewer name captured on the review form. */
export const REVIEW_AUTHOR_NAME_MAX_LENGTH = 60;

/** Max photos a customer can attach to one review. */
export const REVIEW_MAX_IMAGES = 4;

/** Max size (bytes) for one review photo — smaller than the admin product-video
 *  cap since these are customer phone photos, not admin-curated clips. */
export const REVIEW_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
