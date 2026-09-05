import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

function make() {
  const prisma = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    variant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const stripe = { client: { refunds: { create: vi.fn().mockResolvedValue({ id: 're_1' }) } } };
  const mail = { sendShippingNotification: vi.fn().mockResolvedValue(undefined) };
  return {
    prisma,
    stripe,
    mail,
    service: new OrdersService(prisma as never, stripe as never, mail as never),
  };
}

const order = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  email: 'b@x.com',
  userId: null,
  status: 'pending',
  paymentMethod: 'cod',
  stripePaymentIntentId: null,
  currency: 'usd',
  items: [{ id: 'i1', variantId: 'v1', titleSnapshot: 'T', priceSnapshot: 100, quantity: 2 }],
  subtotal: 200,
  shipping: 0,
  tax: 0,
  total: 200,
  shippingAddress: { name: 'B', line1: '1', city: 'c', postalCode: '1', country: 'US' },
  trackingNumber: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('OrdersService transitions', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
    ctx.prisma.order.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...order(),
      ...data,
    }));
  });

  it('confirm: COD pending -> confirmed', async () => {
    ctx.prisma.order.findUnique.mockResolvedValue(order({ status: 'pending' }));
    const res = await ctx.service.confirmOrder('o1');
    expect(res.status).toBe('confirmed');
  });

  it('confirm rejects a Stripe order', async () => {
    ctx.prisma.order.findUnique.mockResolvedValue(
      order({ paymentMethod: 'stripe', status: 'confirmed' }),
    );
    await expect(ctx.service.confirmOrder('o1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mark-delivered: fulfilled -> delivered, and rejects other statuses', async () => {
    ctx.prisma.order.findUnique.mockResolvedValue(order({ status: 'confirmed' }));
    await expect(ctx.service.markDelivered('o1')).rejects.toBeInstanceOf(ConflictException);

    ctx.prisma.order.findUnique.mockResolvedValue(order({ status: 'fulfilled' }));
    const res = await ctx.service.markDelivered('o1');
    expect(res.status).toBe('delivered');
  });

  it('fulfill requires a confirmed order and sends the shipping email', async () => {
    ctx.prisma.order.findUnique.mockResolvedValue(order({ status: 'pending' }));
    await expect(ctx.service.fulfill('o1', 'TRK1')).rejects.toBeInstanceOf(ConflictException);

    ctx.prisma.order.findUnique.mockResolvedValue(order({ status: 'confirmed' }));
    const res = await ctx.service.fulfill('o1', 'TRK1');
    expect(res.status).toBe('fulfilled');
    expect(res.trackingNumber).toBe('TRK1');
    expect(ctx.mail.sendShippingNotification).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'o1', trackingNumber: 'TRK1' }),
    );
  });

  it('cancel: COD pending -> cancelled and restocks', async () => {
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(order({ status: 'pending' }))
      .mockResolvedValueOnce(order({ status: 'cancelled' }));
    const res = await ctx.service.cancel('o1');
    expect(res.status).toBe('cancelled');
    expect(ctx.prisma.variant.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { increment: 2 } },
    });
  });

  it('refund: Stripe confirmed -> refunded, calls Stripe, restocks (not shipped)', async () => {
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(
        order({ paymentMethod: 'stripe', status: 'confirmed', stripePaymentIntentId: 'pi_1' }),
      )
      .mockResolvedValueOnce(order({ status: 'refunded' }));
    const res = await ctx.service.refund('o1', 'changed mind');
    expect(res.status).toBe('refunded');
    expect(ctx.stripe.client.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_1' }),
    );
    expect(ctx.prisma.variant.updateMany).toHaveBeenCalled();
  });

  it('refund of a fulfilled order does not restock', async () => {
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(
        order({ paymentMethod: 'stripe', status: 'fulfilled', stripePaymentIntentId: 'pi_1' }),
      )
      .mockResolvedValueOnce(order({ status: 'refunded' }));
    await ctx.service.refund('o1');
    expect(ctx.prisma.variant.updateMany).not.toHaveBeenCalled();
  });
});

describe('OrdersService.getForCustomer', () => {
  it('guest order needs a matching email', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique.mockResolvedValue(order({ userId: null, email: 'b@x.com' }));
    await expect(ctx.service.getForCustomer('o1', undefined, 'other@x.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(ctx.service.getForCustomer('o1', undefined, 'b@x.com')).resolves.toMatchObject({
      id: 'o1',
    });
  });

  it('user order is not accessible via email alone', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique.mockResolvedValue(order({ userId: 'u1', email: 'b@x.com' }));
    await expect(ctx.service.getForCustomer('o1', undefined, 'b@x.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      ctx.service.getForCustomer('o1', { id: 'u1', email: 'b@x.com', role: 'customer' }, undefined),
    ).resolves.toMatchObject({ id: 'o1' });
  });
});

describe('OrdersService.setStatus (manual override)', () => {
  it('restocks when moving from an active status to cancelled', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(order({ status: 'fulfilled' }))
      .mockResolvedValueOnce(order({ status: 'cancelled' }));
    ctx.prisma.order.update.mockResolvedValue(order({ status: 'cancelled' }));

    const res = await ctx.service.setStatus('o1', 'cancelled');
    expect(res.status).toBe('cancelled');
    expect(ctx.prisma.variant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: { increment: 2 } } }),
    );
  });

  it('re-deducts (guarded) when moving from cancelled back to an active status', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(order({ status: 'cancelled' }))
      .mockResolvedValueOnce(order({ status: 'confirmed' }));
    ctx.prisma.order.update.mockResolvedValue(order({ status: 'confirmed' }));

    await ctx.service.setStatus('o1', 'confirmed');
    expect(ctx.prisma.variant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      }),
    );
  });

  it('rejects the move back when stock is insufficient', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique.mockResolvedValueOnce(order({ status: 'refunded' }));
    ctx.prisma.variant.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(ctx.service.setStatus('o1', 'confirmed')).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not touch stock for active -> active moves', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(order({ status: 'pending' }))
      .mockResolvedValueOnce(order({ status: 'delivered' }));
    ctx.prisma.order.update.mockResolvedValue(order({ status: 'delivered' }));

    await ctx.service.setStatus('o1', 'delivered');
    expect(ctx.prisma.variant.updateMany).not.toHaveBeenCalled();
  });

  it('is a no-op when the status is unchanged', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique.mockResolvedValueOnce(order({ status: 'confirmed' }));
    const res = await ctx.service.setStatus('o1', 'confirmed');
    expect(res.status).toBe('confirmed');
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('OrdersService.lookup', () => {
  it('rejects a too-short reference before touching the db', async () => {
    const ctx = make();
    await expect(ctx.service.lookup('abc', 'b@x.com')).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('queries guest orders by id-suffix / tracking number + email and returns the id', async () => {
    const ctx = make();
    ctx.prisma.order.findFirst.mockResolvedValue({ id: 'o1' });
    await expect(ctx.service.lookup('B7ANCVIS', 'B@x.com')).resolves.toEqual({ orderId: 'o1' });

    const where = ctx.prisma.order.findFirst.mock.calls[0][0].where;
    expect(where.userId).toBeNull();
    expect(where.email).toEqual({ equals: 'b@x.com', mode: 'insensitive' });
    expect(where.OR).toEqual([
      { id: { endsWith: 'b7ancvis' } },
      { trackingNumber: { equals: 'B7ANCVIS', mode: 'insensitive' } },
    ]);
  });

  it('404s when nothing matches', async () => {
    const ctx = make();
    ctx.prisma.order.findFirst.mockResolvedValue(null);
    await expect(ctx.service.lookup('NOPENOPE', 'b@x.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('OrdersService.remove', () => {
  it('404s when the order is missing', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique.mockResolvedValue(null);
    await expect(ctx.service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.prisma.order.delete).not.toHaveBeenCalled();
  });

  it('deletes an existing order (no stock changes)', async () => {
    const ctx = make();
    ctx.prisma.order.findUnique.mockResolvedValue(order());
    await ctx.service.remove('o1');
    expect(ctx.prisma.order.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
    expect(ctx.prisma.variant.updateMany).not.toHaveBeenCalled();
  });
});
