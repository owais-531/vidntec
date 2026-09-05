import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { ShippingAddress } from '@vidntec/shared';
import { Prisma } from '@vidntec/shared/prisma';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { OrderLineSnapshot } from '../checkout/checkout.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async process(event: Stripe.Event): Promise<void> {
    // Fast idempotency check; the authoritative one is inside the transaction.
    const seen = await this.prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
    if (seen) return;

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event);
        break;
      case 'checkout.session.expired':
        await this.onCheckoutExpired(event);
        break;
      default:
        await this.record(event);
    }
  }

  private async onCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== 'paid') {
      await this.record(event);
      return;
    }

    const [existingOrder, pending] = await Promise.all([
      this.prisma.order.findUnique({
        where: { stripeSessionId: session.id },
        select: { id: true },
      }),
      this.prisma.pendingCheckout.findUnique({ where: { stripeSessionId: session.id } }),
    ]);

    if (existingOrder || !pending || pending.status !== 'open') {
      await this.record(event);
      return;
    }

    const lines = pending.lineItems as unknown as OrderLineSnapshot[];
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const line of lines) {
          const variant = await tx.variant.findUnique({
            where: { id: line.variantId },
            select: { stock: true },
          });
          if (!variant) continue; // deleted variant — snapshot still carries the data
          const decrement = Math.min(line.quantity, variant.stock);
          if (decrement < line.quantity) {
            const msg = `Oversell after paid Stripe session ${session.id}: variant ${line.variantId} needed ${line.quantity}, had ${variant.stock}`;
            this.logger.warn(msg);
            Sentry.captureMessage(msg, 'warning');
          }
          await tx.variant.update({
            where: { id: line.variantId },
            data: { stock: { decrement } },
          });
        }

        await tx.order.create({
          data: {
            userId: pending.userId,
            email: pending.email,
            // a completed card payment lands the order straight at "confirmed"
            status: 'confirmed',
            paymentMethod: 'stripe',
            currency: pending.currency,
            subtotal: pending.subtotal,
            shipping: pending.shipping,
            tax: pending.tax,
            total: pending.total,
            stripePaymentIntentId: paymentIntentId,
            stripeSessionId: session.id,
            shippingAddress: pending.shippingAddress as Prisma.InputJsonValue,
            items: {
              create: lines.map((l) => ({
                variantId: l.variantId,
                titleSnapshot: l.titleSnapshot,
                priceSnapshot: l.priceSnapshot,
                quantity: l.quantity,
              })),
            },
          },
        });

        await tx.pendingCheckout.update({
          where: { id: pending.id },
          data: { status: 'consumed' },
        });
        if (pending.cartId) {
          await tx.cartItem.deleteMany({ where: { cartId: pending.cartId } });
        }
        await tx.processedStripeEvent.create({ data: { id: event.id, type: event.type } });
      });
    } catch (err) {
      // A concurrent delivery won the race (unique on the order/event) — that's fine.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return;
      }
      throw err; // 5xx → Stripe retries
    }

    const order = await this.prisma.order.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });
    if (order) {
      await this.mail.sendOrderConfirmation({
        to: pending.email,
        orderId: order.id,
        paymentMethod: 'stripe',
        items: lines,
        subtotal: pending.subtotal,
        shipping: pending.shipping,
        tax: pending.tax,
        total: pending.total,
        currency: pending.currency,
        shippingAddress: pending.shippingAddress as unknown as ShippingAddress,
      });
    }
  }

  private async onCheckoutExpired(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    await this.prisma.pendingCheckout
      .updateMany({
        where: { stripeSessionId: session.id, status: 'open' },
        data: { status: 'expired' },
      })
      .catch(() => undefined);
    await this.record(event);
  }

  private async record(event: Stripe.Event): Promise<void> {
    await this.prisma.processedStripeEvent
      .create({ data: { id: event.id, type: event.type } })
      .catch(() => undefined);
  }
}
