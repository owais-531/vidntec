import type {
  AdminProduct,
  AdminProductListItem,
  AdminVariant,
  ProductImageDto,
} from '@vidntec/shared';
import type { Prisma, ProductImage, Variant } from '@vidntec/shared/prisma';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { images: true; variants: true };
}>;

export function toImageDto(image: ProductImage): ProductImageDto {
  return { id: image.id, url: image.url, publicId: image.publicId, position: image.position };
}

export function toAdminVariant(v: Variant): AdminVariant {
  return {
    id: v.id,
    productId: v.productId,
    name: v.name,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    sku: v.sku,
    stock: v.stock,
  };
}

export function toAdminProduct(p: ProductWithRelations): AdminProduct {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    status: p.status,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    images: [...p.images].sort((a, b) => a.position - b.position).map(toImageDto),
    variants: [...p.variants]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toAdminVariant),
  };
}

export function toListItem(p: ProductWithRelations): AdminProductListItem {
  const prices = p.variants.map((v) => v.price);
  const primary = [...p.images].sort((a, b) => a.position - b.position)[0];
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    featured: p.featured,
    primaryImageUrl: primary?.url ?? null,
    variantCount: p.variants.length,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    createdAt: p.createdAt.toISOString(),
  };
}
