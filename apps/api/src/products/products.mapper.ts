import type {
  AdminProduct,
  AdminProductListItem,
  AdminVariant,
  CustomizationColorOption,
  ProductImageDto,
  ProductSpec,
} from '@vidntec/shared';
import type { Prisma, ProductImage, Variant } from '@vidntec/shared/prisma';

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { images: true; variants: true; category: true };
}>;

export function toColorOptions(value: Prisma.JsonValue): CustomizationColorOption[] {
  return Array.isArray(value) ? (value as unknown as CustomizationColorOption[]) : [];
}

export function toProductSpecs(value: Prisma.JsonValue): ProductSpec[] {
  return Array.isArray(value) ? (value as unknown as ProductSpec[]) : [];
}

export function toImageDto(image: ProductImage): ProductImageDto {
  return {
    id: image.id,
    url: image.url,
    publicId: image.publicId,
    position: image.position,
    type: image.type === 'video' ? 'video' : 'image',
    variantId: image.variantId,
  };
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
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    customizationNameEnabled: p.customizationNameEnabled,
    customizationColorEnabled: p.customizationColorEnabled,
    customizationColorOptions: toColorOptions(p.customizationColorOptions),
    specs: toProductSpecs(p.specs),
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
    categoryName: p.category?.name ?? null,
    primaryImageUrl: primary?.url ?? null,
    variantCount: p.variants.length,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    createdAt: p.createdAt.toISOString(),
  };
}
