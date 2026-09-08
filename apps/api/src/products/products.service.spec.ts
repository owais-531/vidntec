import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsService } from './products.service';

function make() {
  const prisma = {
    product: { count: vi.fn().mockResolvedValue(1), findUnique: vi.fn() },
    productImage: {
      findFirst: vi.fn().mockResolvedValue({ position: 0 }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'img1',
        publicId: data.publicId,
        url: data.url,
        position: data.position,
        type: data.type,
      })),
      delete: vi.fn(),
    },
  };
  const cloudinary = { deleteAsset: vi.fn() };
  return {
    prisma,
    cloudinary,
    service: new ProductsService(prisma as never, cloudinary as never),
  };
}

describe('ProductsService media', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('persists the media type on attach', async () => {
    const dto = await ctx.service.attachImage('p1', {
      url: 'https://res.cloudinary.com/x/video/upload/v1/clip.mp4',
      publicId: 'vidntec/products/clip',
      type: 'video',
    });
    expect(ctx.prisma.productImage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'video' }) }),
    );
    expect(dto.type).toBe('video');
  });

  it('deletes a video asset with the video resource_type', async () => {
    ctx.prisma.productImage.findFirst.mockResolvedValueOnce({
      id: 'img1',
      productId: 'p1',
      publicId: 'vidntec/products/clip',
      type: 'video',
    });
    await ctx.service.removeImage('p1', 'img1');
    expect(ctx.cloudinary.deleteAsset).toHaveBeenCalledWith('vidntec/products/clip', 'video');
  });
});
