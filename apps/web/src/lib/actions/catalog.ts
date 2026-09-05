'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type {
  AdminProduct,
  AdminVariant,
  AttachImageInput,
  CreateProductInput,
  ProductImageDto,
  StockAdjustmentInput,
  UpdateProductInput,
  UploadSignatureResponse,
  VariantInput,
  VariantUpdate,
} from '@vidntec/shared';
import { apiFetch } from '../api';
import { requireAdmin } from '../auth';
import { runAction, type ActionResult } from './result';

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
});

/** Refresh the admin pages that changed AND the storefront `products` data cache. */
function bump(...paths: string[]): void {
  revalidateTag('products');
  for (const path of paths) revalidatePath(path);
}

// ── products ────────────────────────────────────────────────────────────────

export async function createProductAction(
  input: CreateProductInput,
): Promise<ActionResult<AdminProduct>> {
  await requireAdmin();
  const res = await runAction(() => apiFetch<AdminProduct>('/admin/products', json(input)));
  if (res.ok) bump('/admin/products');
  return res;
}

export async function updateProductAction(
  id: string,
  input: UpdateProductInput,
): Promise<ActionResult<AdminProduct>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  );
  if (res.ok) bump('/admin/products', `/admin/products/${id}`);
  return res;
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<undefined>(`/admin/products/${id}`, { method: 'DELETE' }),
  );
  if (res.ok) bump('/admin/products');
  return res;
}

// ── variants ────────────────────────────────────────────────────────────────

export async function addVariantAction(
  productId: string,
  input: VariantInput,
): Promise<ActionResult<AdminVariant>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminVariant>(`/admin/products/${productId}/variants`, json(input)),
  );
  if (res.ok) bump(`/admin/products/${productId}`, '/admin/inventory');
  return res;
}

export async function updateVariantAction(
  productId: string,
  variantId: string,
  input: VariantUpdate,
): Promise<ActionResult<AdminVariant>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminVariant>(`/admin/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) bump(`/admin/products/${productId}`, '/admin/inventory');
  return res;
}

export async function deleteVariantAction(
  productId: string,
  variantId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<undefined>(`/admin/variants/${variantId}`, { method: 'DELETE' }),
  );
  if (res.ok) bump(`/admin/products/${productId}`, '/admin/inventory');
  return res;
}

export async function adjustStockAction(
  variantId: string,
  input: StockAdjustmentInput,
  opts: { productId?: string } = {},
): Promise<ActionResult<AdminVariant>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminVariant>(`/admin/variants/${variantId}/stock`, json(input)),
  );
  if (res.ok) bump('/admin/inventory', ...(opts.productId ? [`/admin/products/${opts.productId}`] : []));
  return res;
}

// ── images ──────────────────────────────────────────────────────────────────

export async function getUploadSignatureAction(): Promise<ActionResult<UploadSignatureResponse>> {
  await requireAdmin();
  return runAction(() =>
    apiFetch<UploadSignatureResponse>(
      '/admin/uploads/signature',
      json({ folder: 'vidntec/products' }),
    ),
  );
}

export async function attachImageAction(
  productId: string,
  input: AttachImageInput,
): Promise<ActionResult<ProductImageDto>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<ProductImageDto>(`/admin/products/${productId}/images`, json(input)),
  );
  if (res.ok) bump(`/admin/products/${productId}`, '/admin/products');
  return res;
}

export async function reorderImagesAction(
  productId: string,
  imageIds: string[],
): Promise<ActionResult<ProductImageDto[]>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<ProductImageDto[]>(`/admin/products/${productId}/images/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ imageIds }),
    }),
  );
  if (res.ok) bump(`/admin/products/${productId}`, '/admin/products');
  return res;
}

export async function deleteImageAction(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<undefined>(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  );
  if (res.ok) bump(`/admin/products/${productId}`, '/admin/products');
  return res;
}
