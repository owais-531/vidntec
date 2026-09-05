import type { CheckoutSessionStatus, ShippingRate } from '@vidntec/shared';
import { apiFetch } from '../api';

export function getShippingRates(): Promise<ShippingRate[]> {
  return apiFetch<ShippingRate[]>('/shipping/rates', { forwardCookies: false });
}

export function getCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionStatus> {
  return apiFetch<CheckoutSessionStatus>(
    `/checkout/session/${encodeURIComponent(sessionId)}`,
    { forwardCookies: false },
  );
}
