import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorefrontService } from './storefront.service';

function make() {
  const prisma = {
    product: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  return { prisma, service: new StorefrontService(prisma as never) };
}

const now = new Date();
const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'T',
  slug: 't',
  description: '',
  status: 'active',
  featured: false,
  updatedAt: now,
  createdAt: now,
  images: [],
  variants: [{ price: 1000, compareAtPrice: null, stock: 5, createdAt: now }],
  ...over,
});

const query = (over: Record<string, unknown> = {}) => ({
  sort: 'newest' as const,
  featured: false,
  onSale: false,
  page: 1,
  pageSize: 24,
  ...over,
});

describe('StorefrontService.list', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
    ctx.prisma.product.count.mockResolvedValue(1);
  });

  it('rolls up sale fields: onSale + discountPercent from the biggest variant discount', async () => {
    ctx.prisma.product.findMany.mockResolvedValue([
      product({
        variants: [
          { price: 800, compareAtPrice: 1000, stock: 3, createdAt: now }, // 20% off
          { price: 750, compareAtPrice: 1000, stock: 2, createdAt: now }, // 25% off
          { price: 500, compareAtPrice: null, stock: 1, createdAt: now },
        ],
      }),
    ]);
    const { items } = await ctx.service.list(query());
    expect(items[0]).toMatchObject({
      onSale: true,
      discountPercent: 25,
      priceMin: 500,
      priceMax: 800,
      originalPriceMin: 500, // the non-sale variant contributes its own price
      originalPriceMax: 1000,
    });
  });

  it('not on sale when compareAtPrice is missing or not above price', async () => {
    ctx.prisma.product.findMany.mockResolvedValue([
      product({ variants: [{ price: 1000, compareAtPrice: 1000, stock: 1, createdAt: now }] }),
    ]);
    const { items } = await ctx.service.list(query());
    expect(items[0]).toMatchObject({ onSale: false, discountPercent: 0 });
  });

  it('featured filter is passed to the where clause', async () => {
    ctx.prisma.product.findMany.mockResolvedValue([]);
    await ctx.service.list(query({ featured: true }));
    expect(ctx.prisma.product.findMany.mock.calls[0][0].where).toMatchObject({ featured: true });
  });

  it('onSale filter narrows in the query and refines out false positives', async () => {
    ctx.prisma.product.findMany.mockResolvedValue([
      product({ id: 'a', variants: [{ price: 800, compareAtPrice: 1000, stock: 1, createdAt: now }] }),
      product({ id: 'b', variants: [{ price: 1000, compareAtPrice: 1000, stock: 1, createdAt: now }] }),
    ]);
    ctx.prisma.product.count.mockResolvedValue(2);
    const { items, total } = await ctx.service.list(query({ onSale: true }));
    expect(ctx.prisma.product.findMany.mock.calls[0][0].where).toMatchObject({
      variants: { some: { compareAtPrice: { not: null } } },
    });
    expect(items.map((i) => i.id)).toEqual(['a']);
    expect(total).toBe(1);
  });
});

describe('StorefrontService.getBySlug', () => {
  it('marks the on-sale variant and rolls up product sale fields', async () => {
    const ctx = make();
    ctx.prisma.product.findFirst.mockResolvedValue(
      product({
        variants: [
          { id: 'v1', name: 'A', price: 800, compareAtPrice: 1000, stock: 2, createdAt: now },
          { id: 'v2', name: 'B', price: 500, compareAtPrice: null, stock: 0, createdAt: now },
        ],
      }),
    );
    const res = await ctx.service.getBySlug('t');
    expect(res.onSale).toBe(true);
    expect(res.discountPercent).toBe(20);
    expect(res.variants.find((v) => v.id === 'v1')).toMatchObject({ onSale: true, compareAtPrice: 1000 });
    expect(res.variants.find((v) => v.id === 'v2')).toMatchObject({ onSale: false, compareAtPrice: null });
  });
});
