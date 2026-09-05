import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, CART_COOKIE, type CartView } from '@vidntec/shared';
import { apiFetch } from '../api';

const EMPTY: CartView = { id: null, lines: [], subtotal: 0, itemCount: 0, removedCount: 0 };

/**
 * Read the current cart for a Server Component render. Skips the API entirely
 * when there's neither a cart cookie nor a session (so a brand-new guest never
 * triggers cart creation during render, which RSC can't persist).
 */
export async function getCart(): Promise<CartView> {
  const store = await cookies();
  const hasCart = store.has(CART_COOKIE);
  const hasSession = store.has(ACCESS_TOKEN_COOKIE);
  if (!hasCart && !hasSession) return EMPTY;

  try {
    return await apiFetch<CartView>('/cart');
  } catch {
    return EMPTY;
  }
}

export async function getCartCount(): Promise<number> {
  return (await getCart()).itemCount;
}
