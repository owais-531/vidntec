'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { AdminCategory, CategoryInput, CategoryUpdate } from '@vidntec/shared';
import { apiFetch } from '../api';
import { requireAdmin } from '../auth';
import { runAction, type ActionResult } from './result';

/** Refresh the admin page + every storefront surface that renders categories. */
function bump(): void {
  revalidateTag('products');
  revalidateTag('categories');
  revalidatePath('/admin/categories');
  revalidatePath('/');
  revalidatePath('/categories');
}

export async function createCategoryAction(
  input: CategoryInput,
): Promise<ActionResult<AdminCategory>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminCategory>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) bump();
  return res;
}

export async function updateCategoryAction(
  id: string,
  input: CategoryUpdate,
): Promise<ActionResult<AdminCategory>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminCategory>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  if (res.ok) bump();
  return res;
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<undefined>(`/admin/categories/${id}`, { method: 'DELETE' }),
  );
  if (res.ok) bump();
  return res;
}

export async function reorderCategoriesAction(
  ids: string[],
): Promise<ActionResult<AdminCategory[]>> {
  await requireAdmin();
  const res = await runAction(() =>
    apiFetch<AdminCategory[]>('/admin/categories/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    }),
  );
  if (res.ok) bump();
  return res;
}
