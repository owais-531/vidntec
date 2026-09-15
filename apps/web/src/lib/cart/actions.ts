'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { CART_COOKIE, type CartView } from '@vidntec/shared';
import { apiCall } from '../api';
import { parseSetCookies } from '../set-cookie';
import { runAction, type ActionResult } from '../actions/result';

/** Relay the API's guest-cart cookie to the browser after a cart mutation. */
async function relayCartCookie(setCookies: string[]): Promise<void> {
  const store = await cookies();
  for (const c of parseSetCookies(setCookies, new Set([CART_COOKIE]))) {
    store.set(c.name, c.value, c.options);
  }
}

function revalidateCartViews(): void {
  revalidatePath('/cart');
  revalidatePath('/', 'layout'); // header badge
}

export interface AddToCartPersonalization {
  customName?: string;
  customColorLabel?: string;
}

export async function addToCartAction(
  variantId: string,
  quantity = 1,
  personalization: AddToCartPersonalization = {},
): Promise<ActionResult<CartView>> {
  const res = await runAction(async () => {
    const { data, setCookies } = await apiCall<CartView>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity, ...personalization }),
    });
    await relayCartCookie(setCookies);
    return data;
  });
  if (res.ok) revalidateCartViews();
  return res;
}

export async function updateCartLineAction(
  itemId: string,
  quantity: number,
): Promise<ActionResult<CartView>> {
  const res = await runAction(async () => {
    const { data, setCookies } = await apiCall<CartView>(
      `/cart/items/${encodeURIComponent(itemId)}`,
      { method: 'PATCH', body: JSON.stringify({ quantity }) },
    );
    await relayCartCookie(setCookies);
    return data;
  });
  if (res.ok) revalidateCartViews();
  return res;
}

export async function removeCartLineAction(itemId: string): Promise<ActionResult<CartView>> {
  const res = await runAction(async () => {
    const { data, setCookies } = await apiCall<CartView>(
      `/cart/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' },
    );
    await relayCartCookie(setCookies);
    return data;
  });
  if (res.ok) revalidateCartViews();
  return res;
}
