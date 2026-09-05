'use server';

import { revalidatePath } from 'next/cache';
import {
  CART_COOKIE,
  checkoutSchema,
  type CheckoutInput,
  type CheckoutResult,
  type Quote,
} from '@vidntec/shared';
import { cookies } from 'next/headers';
import { apiCall } from '../api';
import { parseSetCookies } from '../set-cookie';
import { runAction, type ActionResult } from '../actions/result';

export async function quoteAction(shippingRateId: string): Promise<ActionResult<Quote>> {
  return runAction(async () => {
    const { data } = await apiCall<Quote>('/checkout/quote', {
      method: 'POST',
      body: JSON.stringify({ shippingRateId }),
    });
    return data;
  });
}

export async function checkoutAction(
  raw: CheckoutInput,
): Promise<ActionResult<CheckoutResult>> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Please check the form', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const res = await runAction(async () => {
    const { data, setCookies } = await apiCall<CheckoutResult>('/checkout', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    // COD clears the cart server-side; relay any cart-cookie change.
    const store = await cookies();
    for (const c of parseSetCookies(setCookies, new Set([CART_COOKIE]))) {
      store.set(c.name, c.value, c.options);
    }
    return data;
  });

  if (res.ok && res.data.paymentMethod === 'cod') {
    revalidatePath('/cart');
    revalidatePath('/', 'layout');
  }
  return res;
}
