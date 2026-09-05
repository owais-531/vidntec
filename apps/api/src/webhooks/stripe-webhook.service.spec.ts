import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { StripeWebhookService } from './stripe-webhook.service';

function make() {
  const prisma = {
    processedStripeEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    order: { findUnique: vi.fn().mockResolvedValue(null) },
    pendingCheckout: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    variant: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) },
    cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const mail = { sendOrderConfirmation: vi.fn().mockResolvedValue(undefined) };
  return { service: new StripeWebhookService(prisma as never, mail as never), prisma, mail };
}

function completedEvent(sessionId = 'cs_1'): Stripe.Event {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        payment_status: 'paid',
        payment_intent: 'pi_1',
      },
    },
  } as unknown as Stripe.Event;
}

describe('StripeWebhookService', () => {
  it('is a no-op for an already-processed event', async () => {
    const ctx = make();
    ctx.prisma.processedStripeEvent.findUnique.mockResolvedValue({ id: 'evt_1' });

    await ctx.service.process(completedEvent());

    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
    expect(ctx.prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('does nothing when an order already exists for the session', async () => {
    const ctx = make();
    ctx.prisma.processedStripeEvent.findUnique.mockResolvedValue(null);
    ctx.prisma.order.findUnique.mockResolvedValue({ id: 'ord_existing' });
    ctx.prisma.pendingCheckout.findUnique.mockResolvedValue({ id: 'pc_1', status: 'open' });

    await ctx.service.process(completedEvent());

    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a paid order and clamps stock decrement to available (oversell)', async () => {
    const ctx = make();
    ctx.prisma.processedStripeEvent.findUnique.mockResolvedValue(null);
    ctx.prisma.order.findUnique
      .mockResolvedValueOnce(null) // pre-check
      .mockResolvedValueOnce({ id: 'ord_new' }); // post-txn lookup for the email
    ctx.prisma.pendingCheckout.findUnique.mockResolvedValue({
      id: 'pc_1',
      status: 'open',
      userId: null,
      email: 'buyer@x.com',
      shippingAddress: { name: 'B', line1: '1', city: 'c', postalCode: '1', country: 'US' },
      subtotal: 3000,
      shipping: 500,
      tax: 0,
      total: 3500,
      cartId: 'cart_1',
      lineItems: [
        { variantId: 'v1', titleSnapshot: 'Thing — Blue', priceSnapshot: 1500, quantity: 3 },
      ],
    });
    // only 1 in stock though 3 were paid for
    ctx.prisma.variant.findUnique.mockResolvedValue({ stock: 1 });
    const orderCreate = vi.fn().mockResolvedValue({ id: 'ord_new' });
    ctx.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({ ...ctx.prisma, order: { create: orderCreate } }),
    );

    await ctx.service.process(completedEvent());

    expect(ctx.prisma.variant.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { decrement: 1 } }, // clamped from 3 -> 1
    });
    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'confirmed', paymentMethod: 'stripe' }),
      }),
    );
    expect(ctx.mail.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@x.com', orderId: 'ord_new', paymentMethod: 'stripe' }),
    );
  });
});
