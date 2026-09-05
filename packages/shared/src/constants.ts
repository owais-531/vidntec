/** Shared, non-secret constants for the FE/BE contract. */

export const ROLES = ['customer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PRODUCT_STATUSES = ['draft', 'active'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

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

/** Variants at or below this stock level are flagged in the admin inventory view. */
export const LOW_STOCK_THRESHOLD = 5;
