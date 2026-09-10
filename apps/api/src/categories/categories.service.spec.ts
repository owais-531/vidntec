import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from './categories.service';

function make() {
  const prisma = {
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  return { prisma, service: new CategoriesService(prisma as never) };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'Desk Accessories',
  slug: 'desk-accessories',
  color: '#dce9e2',
  emoji: null,
  position: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('CategoriesService.create', () => {
  it('slugifies the name and appends a suffix on a slug clash', async () => {
    const ctx = make();
    ctx.prisma.category.findFirst
      .mockResolvedValueOnce({ id: 'other' }) // 'desk-accessories' taken
      .mockResolvedValueOnce(null) // 'desk-accessories-2' free
      .mockResolvedValueOnce(null); // last-position lookup
    ctx.prisma.category.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      row({ ...data, id: 'c9' }),
    );

    const res = await ctx.service.create({ name: 'Desk Accessories', color: '#dce9e2' });

    expect(res.slug).toBe('desk-accessories-2');
    expect(res.productCount).toBe(0);
  });

  it('places a new category at the end of the order', async () => {
    const ctx = make();
    ctx.prisma.category.findFirst
      .mockResolvedValueOnce(null) // slug free
      .mockResolvedValueOnce({ position: 4 }); // current last
    ctx.prisma.category.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      row({ ...data }),
    );

    await ctx.service.create({ name: 'New', color: '#dce9e2' });

    expect(ctx.prisma.category.create.mock.calls[0][0].data.position).toBe(5);
  });
});

describe('CategoriesService.remove', () => {
  it('hard-deletes the category (products are detached by the DB FK, not here)', async () => {
    const ctx = make();
    ctx.prisma.category.count.mockResolvedValue(1);
    await ctx.service.remove('c1');
    expect(ctx.prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('404s when the category does not exist', async () => {
    const ctx = make();
    ctx.prisma.category.count.mockResolvedValue(0);
    await expect(ctx.service.remove('nope')).rejects.toThrow('Category not found');
    expect(ctx.prisma.category.delete).not.toHaveBeenCalled();
  });
});

describe('CategoriesService.reorder', () => {
  it('rejects a list that is not a permutation of every category id', async () => {
    const ctx = make();
    ctx.prisma.category.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(ctx.service.reorder(['a'])).rejects.toThrow('every category exactly once');
  });

  it('writes the new position for each id in order', async () => {
    const ctx = make();
    ctx.prisma.category.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]) // validation
      .mockResolvedValueOnce([]); // listAdmin re-read
    await ctx.service.reorder(['b', 'a']);
    expect(ctx.prisma.category.update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { position: 0 } });
    expect(ctx.prisma.category.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { position: 1 } });
  });
});

describe('CategoriesService.listPublic', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides categories that have no active products', async () => {
    const ctx = make();
    ctx.prisma.category.findMany.mockResolvedValue([
      row({ id: 'c1', slug: 'has-products', _count: { products: 3 } }),
      row({ id: 'c2', slug: 'empty', _count: { products: 0 } }),
    ]);
    const res = await ctx.service.listPublic();
    expect(res.map((c) => c.slug)).toEqual(['has-products']);
    expect(res[0].productCount).toBe(3);
  });
});
