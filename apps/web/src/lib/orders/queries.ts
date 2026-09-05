import type { OrderDetail, OrderSummary } from '@vidntec/shared';
import { apiFetch, ApiRequestError } from '../api';

export async function getOrder(id: string, email?: string): Promise<OrderDetail | null> {
  try {
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    return await apiFetch<OrderDetail>(`/orders/${encodeURIComponent(id)}${qs}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function listMyOrders(): Promise<OrderSummary[]> {
  try {
    return await apiFetch<OrderSummary[]>('/account/orders');
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) return [];
    throw err;
  }
}
