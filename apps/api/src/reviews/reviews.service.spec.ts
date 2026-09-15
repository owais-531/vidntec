import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewInputSchema } from '@vidntec/shared';
import { ReviewsService } from './reviews.service';

const reviewRow = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  productId: 'p1',
  userId: 'u1',
  authorName: 'Ayesha',
  rating: 5,
  comment: 'Great!',
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  ...over,
});

function make() {
  const prisma = {
    product: { count: vi.fn().mockResolvedValue(1) },
    review: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) =>
        reviewRow({ ...create, images: [] }),
      ),
      delete: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  const cloudinary = { deleteAsset: vi.fn(), signUpload: vi.fn() };
  return {
    prisma,
    cloudinary,
    service: new ReviewsService(prisma as never, cloudinary as never),
  };
}

describe('ReviewsService.upsertForProduct', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('creates a new review when the customer has none yet for this product', async () => {
    const dto = await ctx.service.upsertForProduct('p1', 'u1', {
      authorName: 'Ayesha',
      rating: 5,
      comment: 'Great!',
      images: [],
    });
    expect(ctx.prisma.review.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId_userId: { productId: 'p1', userId: 'u1' } },
      }),
    );
    expect(dto.authorName).toBe('Ayesha');
    expect(ctx.cloudinary.deleteAsset).not.toHaveBeenCalled();
  });

  it('replaces (not duplicates) an existing review on the same product+user, and cleans up its old images', async () => {
    ctx.prisma.review.findUnique.mockResolvedValue(
      reviewRow({ images: [{ id: 'i1', publicId: 'vidntec/reviews/old', url: 'x', position: 0 }] }),
    );
    await ctx.service.upsertForProduct('p1', 'u1', {
      authorName: 'Ayesha',
      rating: 4,
      comment: 'Updated',
      images: [],
    });
    // One row per (productId, userId) — upsert targets the same key, never `create`-only.
    const call = ctx.prisma.review.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ productId_userId: { productId: 'p1', userId: 'u1' } });
    expect(call.update.images).toEqual({ deleteMany: {}, create: [] });
    expect(ctx.cloudinary.deleteAsset).toHaveBeenCalledWith('vidntec/reviews/old');
  });

  it('404s when the product does not exist', async () => {
    ctx.prisma.product.count.mockResolvedValue(0);
    await expect(
      ctx.service.upsertForProduct('missing', 'u1', {
        authorName: 'Ayesha',
        rating: 5,
        comment: null,
        images: [],
      }),
    ).rejects.toThrow('Product not found');
  });
});

describe('ReviewsService.remove (admin delete)', () => {
  it('deletes the review row and its Cloudinary images', async () => {
    const ctx = make();
    ctx.prisma.review.findUnique.mockResolvedValue(
      reviewRow({
        images: [
          { id: 'i1', publicId: 'vidntec/reviews/a', url: 'x', position: 0 },
          { id: 'i2', publicId: null, url: 'y', position: 1 },
        ],
      }),
    );
    await ctx.service.remove('r1');
    expect(ctx.prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(ctx.cloudinary.deleteAsset).toHaveBeenCalledTimes(1);
    expect(ctx.cloudinary.deleteAsset).toHaveBeenCalledWith('vidntec/reviews/a');
  });

  it('404s when the review does not exist', async () => {
    const ctx = make();
    ctx.prisma.review.findUnique.mockResolvedValue(null);
    await expect(ctx.service.remove('missing')).rejects.toThrow('Review not found');
  });
});

describe('ReviewsService.removeMine', () => {
  it("deletes the caller's own review, looked up by (productId, userId) — not by an id the client passes", async () => {
    const ctx = make();
    ctx.prisma.review.findUnique.mockResolvedValue(
      reviewRow({ images: [{ id: 'i1', publicId: 'vidntec/reviews/a', url: 'x', position: 0 }] }),
    );
    await ctx.service.removeMine('p1', 'u1');
    expect(ctx.prisma.review.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId_userId: { productId: 'p1', userId: 'u1' } } }),
    );
    expect(ctx.prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(ctx.cloudinary.deleteAsset).toHaveBeenCalledWith('vidntec/reviews/a');
  });

  it("404s when the caller has no review for this product (can't delete someone else's)", async () => {
    const ctx = make();
    ctx.prisma.review.findUnique.mockResolvedValue(null);
    await expect(ctx.service.removeMine('p1', 'someone-else')).rejects.toThrow('Review not found');
    expect(ctx.prisma.review.delete).not.toHaveBeenCalled();
  });
});

describe('reviewInputSchema', () => {
  it('requires a rating and/or a non-empty comment', () => {
    expect(
      reviewInputSchema.safeParse({ authorName: 'Ayesha', rating: null, comment: '' }).success,
    ).toBe(false);
    expect(
      reviewInputSchema.safeParse({ authorName: 'Ayesha', rating: 5, comment: null }).success,
    ).toBe(true);
    expect(
      reviewInputSchema.safeParse({ authorName: 'Ayesha', rating: null, comment: 'Nice' }).success,
    ).toBe(true);
  });
});
