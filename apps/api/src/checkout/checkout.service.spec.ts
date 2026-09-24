import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckoutService } from './checkout.service';

function make() {
  const prisma = {
    cart: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    variant: { updateMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const settings = { get: vi.fn().mockResolvedValue({ taxEnabled: true, taxRateBps: 1000, taxLabel: 'Tax', currency: 'usd' }) };
  const shipping = {
    resolveForAddress: vi.fn(async (city: string, subtotal: number) => {
      const rate = { name: 'Std', price: 500, minOrderForFree: 5000 };
      const free = city.trim().toLowerCase() === 'rawalpindi' || city.trim().toLowerCase() === 'islamabad';
      const amount = free || subtotal >= rate.minOrderForFree ? 0 : rate.price;
      return { amount, rateName: rate.name };
    }),
  };
  const stripe = { client: {} };
  const mail = { sendOrderConfirmation: vi.fn().mockResolvedValue(undefined) };
  const config = { getOrThrow: () => 'http://web' } as unknown as ConfigService;
  const service = new CheckoutService(
    prisma as never,
    stripe as never,
    settings as never,
    shipping as never,
    mail as never,
    config as never,
  );
  return { service, prisma, shipping, mail };
}

const activeCart = (qty: number, price = 1000, stock = 100) => ({
  id: 'c1',
  userId: null,
  items: [
    {
      quantity: qty,
      variant: {
        id: 'v1',
        name: 'Blue',
        price,
        stock,
        product: { status: 'active', title: 'Thing' },
      },
    },
  ],
});

describe('CheckoutService.quote', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('prices from current variant data, adds shipping + tax', async () => {
    ctx.prisma.cart.findUnique.mockResolvedValue(activeCart(3, 1000)); // subtotal 3000
    const q = await ctx.service.quote('c1', 'Lahore');
    expect(q.subtotal).toBe(3000);
    expect(q.shipping).toBe(500); // below 5000 free threshold
    expect(q.tax).toBe(300); // 10%
    expect(q.total).toBe(3800);
  });

  it('waives shipping past the free threshold', async () => {
    ctx.prisma.cart.findUnique.mockResolvedValue(activeCart(6, 1000)); // subtotal 6000
    const q = await ctx.service.quote('c1', 'Lahore');
    expect(q.shipping).toBe(0);
    expect(q.shippingFree).toBe(true);
  });

  it('waives shipping for Rawalpindi/Islamabad regardless of subtotal', async () => {
    ctx.prisma.cart.findUnique.mockResolvedValue(activeCart(1, 1000)); // subtotal 1000, below threshold
    const q = await ctx.service.quote('c1', 'Rawalpindi');
    expect(q.shipping).toBe(0);
    expect(q.shippingFree).toBe(true);
  });

  it('rejects an empty cart', async () => {
    ctx.prisma.cart.findUnique.mockResolvedValue({ id: 'c1', userId: null, items: [] });
    await expect(ctx.service.quote('c1', 'Lahore')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when a line exceeds available stock', async () => {
    ctx.prisma.cart.findUnique.mockResolvedValue(activeCart(5, 1000, 2));
    await expect(ctx.service.quote('c1', 'Lahore')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CheckoutService COD order', () => {
  it('decrements stock with a guard and rolls back if it fails', async () => {
    const ctx = make();
    ctx.prisma.cart.findUnique.mockResolvedValue(activeCart(2, 1000, 100));
    ctx.prisma.variant.updateMany.mockResolvedValue({ count: 0 }); // stock guard fails

    await expect(
      ctx.service.checkout(
        {
          email: 'a@b.com',
          shippingAddress: {
            name: 'A',
            line1: 'B',
            city: 'C',
            state: 'Punjab',
            postalCode: '1',
            country: 'US',
          },
          paymentMethod: 'cod',
        },
        'c1',
        undefined,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
