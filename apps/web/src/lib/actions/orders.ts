'use server';

import { revalidatePath } from 'next/cache';
import type { OrderDetail, OrderStatus } from '@vidntec/shared';
import { apiFetch } from '../api';
import { requireAdmin } from '../auth';
import { runAction, type ActionResult } from './result';

function revalidateOrder(id: string): void {
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/inventory');
}

async function transition(
  id: string,
  path: string,
  body?: unknown,
): Promise<ActionResult<OrderDetail>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<OrderDetail>(`/admin/orders/${id}/${path}`, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
  if (res.ok) revalidateOrder(id);
  return res;
}

export async function confirmOrderAction(id: string): Promise<ActionResult<OrderDetail>> {
  return transition(id, 'confirm');
}

export async function cancelOrderAction(id: string): Promise<ActionResult<OrderDetail>> {
  return transition(id, 'cancel');
}

export async function markDeliveredAction(id: string): Promise<ActionResult<OrderDetail>> {
  return transition(id, 'deliver');
}

export async function setOrderStatusAction(
  id: string,
  status: OrderStatus,
): Promise<ActionResult<OrderDetail>> {
  return transition(id, 'status', { status });
}

export async function fulfillOrderAction(
  id: string,
  trackingNumber: string,
): Promise<ActionResult<OrderDetail>> {
  return transition(id, 'fulfill', { trackingNumber });
}

export async function refundOrderAction(
  id: string,
  reason?: string,
): Promise<ActionResult<OrderDetail>> {
  return transition(id, 'refund', reason ? { reason } : {});
}

/** Permanently delete an order record. Does not touch stock. */
export async function deleteOrderAction(id: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<null>(`/admin/orders/${id}`, { method: 'DELETE' }),
  );
  if (res.ok) {
    revalidatePath('/admin/orders');
    revalidatePath('/admin/inventory');
  }
  return res;
}
