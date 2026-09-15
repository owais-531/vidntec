import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsService } from './products.service';

/** Mimic Prisma echoing a create/update: keep [] relations, resolve category connect/disconnect. */
function resolveWrite(data: Record<string, unknown>) {
  const category = data.category as { connect?: { id?: string } } | undefined;
  const connectId = category?.connect?.id ?? null;
  return productRow({
    categoryId: connectId,
    category: connectId ? { id: connectId, name: 'Cat' } : null,
  });
}

const productRow = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'T',
  slug: 't',
  description: '',
  status: 'draft',
  featured: false,
  categoryId: null,
  category: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  variants: [],
  ...over,
});

function make() {
  const prisma = {
    product: {
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => resolveWrite(data)),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => resolveWrite(data)),
    },
    category: { count: vi.fn().mockResolvedValue(1) },
    variant: { findFirst: vi.fn().mockResolvedValue({ id: 'v1', productId: 'p1' }) },
    productImage: {
      findFirst: vi.fn().mockResolvedValue({ position: 0 }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'img1',
        publicId: data.publicId,
        url: data.url,
        position: data.position,
        type: data.type,
        variantId: data.variantId ?? null,
      })),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: where.id,
        publicId: null,
        url: 'https://res.cloudinary.com/x/image/upload/v1/img.jpg',
        position: 0,
        type: 'image',
        variantId: (data.variantId as string | null) ?? null,
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

describe('ProductsService image-to-variant assignment', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('assigns an image to a variant that belongs to the product', async () => {
    const dto = await ctx.service.setImageVariant('p1', 'img1', 'v1');
    expect(ctx.prisma.variant.findFirst).toHaveBeenCalledWith({
      where: { id: 'v1', productId: 'p1' },
    });
    expect(ctx.prisma.productImage.update).toHaveBeenCalledWith({
      where: { id: 'img1' },
      data: { variantId: 'v1' },
    });
    expect(dto.variantId).toBe('v1');
  });

  it('clears the assignment when variantId is null, without checking any variant', async () => {
    const dto = await ctx.service.setImageVariant('p1', 'img1', null);
    expect(ctx.prisma.variant.findFirst).not.toHaveBeenCalled();
    expect(dto.variantId).toBeNull();
  });

  it('rejects a variant that does not belong to this product', async () => {
    ctx.prisma.variant.findFirst.mockResolvedValueOnce(null);
    await expect(ctx.service.setImageVariant('p1', 'img1', 'other-product-variant')).rejects.toThrow(
      'Selected variant does not belong to this product',
    );
  });

  it('404s when the image does not belong to this product', async () => {
    ctx.prisma.productImage.findFirst.mockResolvedValueOnce(null);
    await expect(ctx.service.setImageVariant('p1', 'ghost', 'v1')).rejects.toThrow('Image not found');
  });
});

describe('ProductsService category assignment', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('connects the category on create and returns its name', async () => {
    const res = await ctx.service.create({
      title: 'Widget',
      description: '',
      status: 'draft',
      categoryId: 'cat_1',
      variants: [{ name: 'Std', price: 1000, sku: 'W-1', stock: 1 }],
    });
    expect(ctx.prisma.product.create.mock.calls[0][0].data.category).toEqual({
      connect: { id: 'cat_1' },
    });
    expect(res).toMatchObject({ categoryId: 'cat_1', categoryName: 'Cat' });
  });

  it('rejects create with a category that no longer exists', async () => {
    ctx.prisma.category.count.mockResolvedValue(0);
    await expect(
      ctx.service.create({
        title: 'Widget',
        description: '',
        status: 'draft',
        categoryId: 'ghost',
        variants: [{ name: 'Std', price: 1000, sku: 'W-1', stock: 1 }],
      }),
    ).rejects.toThrow('Selected category no longer exists');
  });

  it('disconnects the category when update is given categoryId: null', async () => {
    const res = await ctx.service.update('p1', { categoryId: null });
    expect(ctx.prisma.product.update.mock.calls[0][0].data.category).toEqual({ disconnect: true });
    expect(res.categoryId).toBeNull();
  });

  it('leaves the category untouched when categoryId is omitted from an update', async () => {
    await ctx.service.update('p1', { title: 'Renamed' });
    expect(ctx.prisma.product.update.mock.calls[0][0].data.category).toBeUndefined();
  });
});
