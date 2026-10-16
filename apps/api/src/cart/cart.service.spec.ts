import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CartService } from './cart.service';

/** Minimal in-memory-ish Prisma stub for the branches we care about. */
function makePrisma() {
  return {
    cart: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    cartItem: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
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
    ctx.prisma.cartItem.findFirst.mockResolvedValue(null);

    await ctx.service.addItem('c1', 'v1', 99);

    expect(ctx.prisma.cartItem.create.mock.calls[0][0].data.quantity).toBe(4);
  });

  it('adds to the existing quantity', async () => {
    ctx.prisma.variant.findUnique.mockResolvedValue({
      id: 'v1',
      stock: 50,
      product: { status: 'active' },
    });
    ctx.prisma.cartItem.findFirst.mockResolvedValue({ id: 'i1', quantity: 2 });

    await ctx.service.addItem('c1', 'v1', 3);

    expect(ctx.prisma.cartItem.update.mock.calls[0][0].data.quantity).toBe(5);
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

describe('CartService.addItem personalization', () => {
  const fields = [
    { id: 'name', type: 'text', label: 'Name', required: true, placeholder: '', maxLength: 10 },
    {
      id: 'colour',
      type: 'dropdown',
      label: 'Colour',
      required: false,
      choices: [{ label: 'Red', hex: '#ff0000' }],
    },
  ];
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
    ctx.prisma.variant.findUnique.mockResolvedValue({
      id: 'v1',
      stock: 50,
      product: { status: 'active', personalizationFields: fields },
    });
    ctx.prisma.cartItem.findFirst.mockResolvedValue(null);
  });

  it('stores the answers, with the hex from the product, and a key', async () => {
    await ctx.service.addItem('c1', 'v1', 1, { name: ' Ali ', colour: 'Red' });
    const data = ctx.prisma.cartItem.create.mock.calls[0][0].data;
    expect(data.personalization).toEqual([
      { fieldId: 'name', label: 'Name', type: 'text', value: 'Ali' },
      { fieldId: 'colour', label: 'Colour', type: 'dropdown', value: 'Red', hex: '#ff0000' },
    ]);
    expect(data.customizationKey).toBe('[["name","Ali"],["colour","Red"]]');
  });

  it('looks up the existing line by variant + key (different names stay separate lines)', async () => {
    await ctx.service.addItem('c1', 'v1', 1, { name: 'Sara' });
    expect(ctx.prisma.cartItem.findFirst.mock.calls[0][0].where).toEqual({
      cartId: 'c1',
      variantId: 'v1',
      customizationKey: '[["name","Sara"]]',
    });
  });

  it('rejects a missing required field and an invalid choice', async () => {
    await expect(ctx.service.addItem('c1', 'v1', 1, {})).rejects.toThrow(BadRequestException);
    await expect(
      ctx.service.addItem('c1', 'v1', 1, { name: 'Ali', colour: 'Hacked' }),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.prisma.cartItem.create).not.toHaveBeenCalled();
  });
});
