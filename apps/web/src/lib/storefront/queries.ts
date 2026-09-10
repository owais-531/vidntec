import type {
  PublicCategory,
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

/** Category reads share the `products` tag plus their own — both invalidate them. */
const CACHED_CATEGORIES: RequestInit & { forwardCookies: boolean } = {
  forwardCookies: false,
  next: { revalidate: 60, tags: ['products', 'categories'] },
};

export function listStorefrontProducts(
  query: Partial<StorefrontListQuery>,
): Promise<Paginated<PublicProductListItem>> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
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

export async function listStorefrontCategories(): Promise<PublicCategory[]> {
  try {
    return await apiFetch<PublicCategory[]>('/categories', CACHED_CATEGORIES);
  } catch {
    // The home page and sitemap render fine without categories — never let a
    // categories hiccup (e.g. the API mid-deploy) take down those pages.
    return [];
  }
}

export async function getStorefrontCategory(slug: string): Promise<PublicCategory | null> {
  try {
    return await apiFetch<PublicCategory>(
      `/categories/${encodeURIComponent(slug)}`,
      CACHED_CATEGORIES,
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}
