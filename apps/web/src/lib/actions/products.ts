'use server';

import type { PublicProductListItem, StorefrontListQuery } from '@vidntec/shared';
import { listStorefrontProducts } from '../storefront/queries';
import type { Paginated } from '../admin/queries';
import { runAction, type ActionResult } from './result';

/** Next page for the infinite-scroll product grid — reuses the cached storefront read. */
export async function loadMoreProductsAction(
  query: Partial<StorefrontListQuery>,
): Promise<ActionResult<Paginated<PublicProductListItem>>> {
  return runAction(() => listStorefrontProducts(query));
}
