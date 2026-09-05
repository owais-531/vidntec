'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type {
  ShippingRate,
  ShippingRateInput,
  ShippingRateUpdate,
  StoreSettings,
  StoreSettingsInput,
} from '@vidntec/shared';
import { apiFetch } from '../api';
import { requireAdmin } from '../auth';
import { runAction, type ActionResult } from './result';

function bumpShipping(): void {
  revalidatePath('/admin/shipping');
  revalidateTag('products'); // checkout/quote uses rates, but keep it simple
}

export async function createShippingRateAction(
  input: ShippingRateInput,
): Promise<ActionResult<ShippingRate>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<ShippingRate>('/admin/shipping/rates', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) bumpShipping();
  return res;
}

export async function updateShippingRateAction(
  id: string,
  input: ShippingRateUpdate,
): Promise<ActionResult<ShippingRate>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<ShippingRate>(`/admin/shipping/rates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) bumpShipping();
  return res;
}

export async function deleteShippingRateAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<undefined>(`/admin/shipping/rates/${id}`, { method: 'DELETE' }),
  );
  if (res.ok) bumpShipping();
  return res;
}

export async function updateSettingsAction(
  input: StoreSettingsInput,
): Promise<ActionResult<StoreSettings>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<StoreSettings>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) {
    revalidatePath('/admin/settings');
    revalidateTag('products');
  }
  return res;
}
