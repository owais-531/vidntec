import type {
  PublicProduct,
  PublicProductListItem,
  StorefrontListQuery,
} from '@vidntec/shared';
import { apiFetch, ApiRequestError } from '../api';
import type { Paginated } from '../admin/queries';

/**
 * Public catalog — no auth, and cached in Next's Data Cache under the `products`
 * tag. Admin catalog mutations call `revalidateTag('products')`.
 */
const CACHED: RequestInit & { forwardCookies: boolean } = {
  forwardCookies: false,
  next: { revalidate: 60, tags: ['products'] },
};

export function listStorefrontProducts(
  query: Partial<StorefrontListQuery>,
): Promise<Paginated<PublicProductListItem>> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (query.featured) params.set('featured', 'true');
  if (query.onSale) params.set('onSale', 'true');
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return apiFetch<Paginated<PublicProductListItem>>(`/products${qs ? `?${qs}` : ''}`, CACHED);
}

export async function getStorefrontProduct(slug: string): Promise<PublicProduct | null> {
  try {
    return await apiFetch<PublicProduct>(`/products/${encodeURIComponent(slug)}`, CACHED);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}
