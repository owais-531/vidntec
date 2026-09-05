'use server';

import { orderLookupSchema, type OrderLookupResult } from '@vidntec/shared';
import { ApiRequestError, apiFetch } from '../api';

export type TrackOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function trackOrderAction(input: {
  reference: string;
  email: string;
}): Promise<TrackOrderResult> {
  const parsed = orderLookupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Enter your order or tracking number and the email you used at checkout.',
    };
  }

  try {
    const res = await apiFetch<OrderLookupResult>('/orders/lookup', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
      forwardCookies: false,
    });
    return { ok: true, orderId: res.orderId };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return {
        ok: false,
        error:
          "We couldn't find an order matching that reference and email. Double-check both and try again.",
      };
    }
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' };
  }
}
