import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { CartService } from './cart.service';

/** Minimal in-memory-ish Prisma stub for the branches we care about. */
function makePrisma() {
  return {
    cart: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    cartItem: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    variant: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(txRef)),
  };
}
let txRef: ReturnType<typeof makePrisma>;

function make() {
  const prisma = makePrisma();
  txRef = prisma;
  return { prisma, service: new CartService(prisma as never) };
}

describe('CartService.addItem', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('clamps the quantity to available stock', async () => {
    ctx.prisma.variant.findUnique.mockResolvedValue({
      id: 'v1',
      stock: 4,
      product: { status: 'active' },
    });
    ctx.prisma.cartItem.findUnique.mockResolvedValue({ quantity: 0 });

    await ctx.service.addItem('c1', 'v1', 99);

    const upsertArg = ctx.prisma.cartItem.upsert.mock.calls[0][0];
    expect(upsertArg.create.quantity).toBe(4);
    expect(upsertArg.update.quantity).toBe(4);
  });

  it('adds to the existing quantity', async () => {
    ctx.prisma.variant.findUnique.mockResolvedValue({
      id: 'v1',
      stock: 50,
      product: { status: 'active' },
    });
    ctx.prisma.cartItem.findUnique.mockResolvedValue({ quantity: 2 });

    await ctx.service.addItem('c1', 'v1', 3);

    expect(ctx.prisma.cartItem.upsert.mock.calls[0][0].update.quantity).toBe(5);
  });

  it('rejects an out-of-stock variant', async () => {
    ctx.prisma.variant.findUnique.mockResolvedValue({
      id: 'v1',
      stock: 0,
      product: { status: 'active' },
    });
    await expect(ctx.service.addItem('c1', 'v1', 1)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CartService.getView', () => {
  it('prices lines from the current variant price and prunes unpublished products', async () => {
    const ctx = make();
    ctx.prisma.cart.findUnique.mockResolvedValue({
      id: 'c1',
      items: [
        {
          id: 'i1',
          quantity: 2,
          variant: {
            id: 'v1',
            productId: 'p1',
            name: 'Blue',
            price: 1500,
            stock: 10,
            product: { status: 'active', slug: 'thing', title: 'Thing', images: [] },
          },
        },
        {
          id: 'i2',
          quantity: 1,
          variant: {
            id: 'v2',
            productId: 'p2',
            name: 'Gone',
            price: 999,
            stock: 5,
            product: { status: 'draft', slug: 'gone', title: 'Gone', images: [] },
          },
        },
      ],
    });

    const view = await ctx.service.getView('c1');

    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]!.lineTotal).toBe(3000);
    expect(view.subtotal).toBe(3000);
    expect(view.removedCount).toBe(1);
    expect(ctx.prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['i2'] } } });
  });
});
