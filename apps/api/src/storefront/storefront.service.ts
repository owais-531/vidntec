import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PublicProduct,
  PublicProductListItem,
  StorefrontListQuery,
} from '@vidntec/shared';
import { Prisma } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { toColorOptions } from '../products/products.mapper';

const ACTIVE = { status: 'active' } as const satisfies Prisma.ProductWhereInput;

type PricedVariant = { price: number; compareAtPrice: number | null };

/** true when the variant has a "was" price above its selling price. */
function variantOnSale(v: PricedVariant): boolean {
  return v.compareAtPrice != null && v.compareAtPrice > v.price;
}

/** Roll up rating aggregates keyed by productId into `{avgRating, reviewCount}`.
 *  `reviewCount` is every review (rated or comment-only); `avgRating` only
 *  averages the ones that carry a star rating. */
function reviewInfo(
  productId: string,
  byProduct: Map<string, { _avg: { rating: number | null }; _count: { _all: number } }>,
) {
  const agg = byProduct.get(productId);
  return { avgRating: agg?._avg.rating ?? null, reviewCount: agg?._count._all ?? 0 };
}

/** Roll up per-variant prices into the product-level sale fields. */
function saleInfo(variants: PricedVariant[]) {
  const prices = variants.map((v) => v.price);
  const originals = variants.map((v) => (variantOnSale(v) ? (v.compareAtPrice as number) : v.price));
  const discounts = variants
    .filter(variantOnSale)
    .map((v) => Math.round((1 - v.price / (v.compareAtPrice as number)) * 100));
  return {
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    originalPriceMin: originals.length ? Math.min(...originals) : 0,
    originalPriceMax: originals.length ? Math.max(...originals) : 0,
    onSale: discounts.length > 0,
    discountPercent: discounts.length ? Math.max(...discounts) : 0,
  };
}

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StorefrontListQuery) {
    const where: Prisma.ProductWhereInput = {
      ...ACTIVE,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.featured ? { featured: true } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      // `onSale` needs a compareAtPrice > price comparison Prisma can't express;
      // narrow cheaply here, then refine in JS below. Fine for this catalog size.
      ...(query.onSale ? { variants: { some: { compareAtPrice: { not: null } } } } : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { images: true, variants: true },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    // One extra batched query (not per-row) to avoid N+1 aggregates.
    const ratingRows = rows.length
      ? await this.prisma.review.groupBy({
          by: ['productId'],
          where: { productId: { in: rows.map((p) => p.id) } },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : [];
    const ratingByProduct = new Map(ratingRows.map((r) => [r.productId, r]));

    let items: PublicProductListItem[] = rows.map((p) => {
      // Cards / social previews always use a still image, never a video frame.
      const primary = [...p.images]
        .sort((a, b) => a.position - b.position)
        .find((i) => i.type !== 'video');
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        featured: p.featured,
        primaryImageUrl: primary?.url ?? null,
        inStock: p.variants.some((v) => v.stock > 0),
        updatedAt: p.updatedAt.toISOString(),
        ...saleInfo(p.variants),
        ...reviewInfo(p.id, ratingByProduct),
      };
    });

    if (query.onSale) items = items.filter((i) => i.onSale);

    // Price sorts depend on the computed min price — apply after mapping.
    if (query.sort === 'price-asc') items = items.sort((a, b) => a.priceMin - b.priceMin);
    if (query.sort === 'price-desc') items = items.sort((a, b) => b.priceMin - a.priceMin);

    return {
      items,
      total: query.onSale ? items.length : total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getBySlug(slug: string): Promise<PublicProduct> {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...ACTIVE }, // draft products 404 for the public
      include: { images: true, variants: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const ratingAgg = await this.prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const variants = [...product.variants]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        onSale: variantOnSale(v),
        stock: v.stock,
        inStock: v.stock > 0,
      }));

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      featured: product.featured,
      category: product.category
        ? { name: product.category.name, slug: product.category.slug }
        : null,
      customizationNameEnabled: product.customizationNameEnabled,
      customizationColorEnabled: product.customizationColorEnabled,
      customizationColorOptions: toColorOptions(product.customizationColorOptions),
      images: [...product.images]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({
          url: i.url,
          position: i.position,
          type: i.type === 'video' ? ('video' as const) : ('image' as const),
          variantId: i.variantId,
        })),
      variants,
      inStock: variants.some((v) => v.inStock),
      updatedAt: product.updatedAt.toISOString(),
      ...saleInfo(product.variants),
      avgRating: ratingAgg._avg.rating,
      reviewCount: ratingAgg._count._all,
    };
  }
}
