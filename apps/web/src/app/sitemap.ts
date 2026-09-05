import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { listStorefrontProducts } from '@/lib/storefront/queries';

export const revalidate = 3600;

async function allProducts() {
  const pageSize = 48;
  const first = await listStorefrontProducts({ sort: 'newest', page: 1, pageSize });
  const items = [...first.items];
  const pages = Math.ceil(first.total / pageSize);
  for (let page = 2; page <= pages; page++) {
    const next = await listStorefrontProducts({ sort: 'newest', page, pageSize });
    items.push(...next.items);
  }
  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/products'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/track'), changeFrequency: 'yearly', priority: 0.2 },
  ];

  try {
    const products = await allProducts();
    return [
      ...staticRoutes,
      ...products.map((p) => ({
        url: absoluteUrl(`/products/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // API unreachable (e.g. during an isolated build) — ship the static routes.
    return staticRoutes;
  }
}
