import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  taxForSubtotal,
  type CheckoutInput,
  type CheckoutResult,
  type CheckoutSessionStatus,
  type Quote,
} from '@vidntec/shared';
import { Prisma } from '@vidntec/shared/prisma';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { SettingsService } from '../settings/settings.service';
import { ShippingService } from '../shipping/shipping.service';
import { MailService } from '../mail/mail.service';
import type { Env } from '../config/env';

export interface OrderLineSnapshot {
  variantId: string;
  titleSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

interface OrderPlan {
  cartId: string;
  userId: string | null;
  lines: OrderLineSnapshot[];
  subtotal: number;
  shipping: number;
  shippingFree: boolean;
  shippingRateName: string;
  tax: number;
  taxLabel: string;
  total: number;
  currency: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly webOrigin: string;
  private readonly sessionTtlSeconds = 30 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly settings: SettingsService,
    private readonly shipping: ShippingService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.webOrigin = config.getOrThrow('WEB_ORIGIN', { infer: true });
  }

  // ── public ────────────────────────────────────────────────────────────────

  async quote(cartId: string | null, shippingRateId: string): Promise<Quote> {
    const plan = await this.buildPlan(cartId, shippingRateId);
    return {
      subtotal: plan.subtotal,
      shipping: plan.shipping,
      shippingFree: plan.shippingFree,
      tax: plan.tax,
      taxLabel: plan.taxLabel,
      total: plan.total,
      currency: plan.currency,
    };
  }

  async checkout(
    input: CheckoutInput,
    cartId: string | null,
    _userId: string | undefined,
  ): Promise<CheckoutResult> {
    // Online payment (Stripe) is disabled until a PKR-capable gateway is wired
    // (PayFast / AlfaPay — see M9). The storefront hides the option; this guard
    // rejects a tampered request so it never reaches the unconfigured Stripe path.
    // `startStripeCheckout` below is retained as the reference for that work.
    if (input.paymentMethod !== 'cod') {
      throw new BadRequestException(
        'Online payment is temporarily unavailable. Please choose Cash on Delivery.',
      );
    }

    const plan = await this.buildPlan(cartId, input.shippingRateId);
    return this.placeCodOrder(plan, input);
  }

  async sessionStatus(sessionId: string): Promise<CheckoutSessionStatus> {
    const order = await this.prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      select: { id: true },
    });
    if (order) return { paymentStatus: 'paid', orderId: order.id };

    try {
      const session = await this.stripe.client.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        return { paymentStatus: 'processing', orderId: null }; // webhook not landed yet
      }
    } catch {
      /* unknown session */
    }
    return { paymentStatus: 'unpaid', orderId: null };
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /** Re-price the cart from current data + validate stock. Never trusts the client. */
  private async buildPlan(
    cartId: string | null,
    shippingRateId: string,
  ): Promise<OrderPlan> {
    if (!cartId) throw new BadRequestException('Your cart is empty');

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const settings = await this.settings.get();
    const rate = await this.shipping.getActive(shippingRateId);

    const lines: OrderLineSnapshot[] = [];
    const problems: Array<{ item: string; available: number; requested: number }> = [];

    for (const item of cart.items) {
      const { variant } = item;
      if (variant.product.status !== 'active') {
        problems.push({ item: variant.product.title, available: 0, requested: item.quantity });
        continue;
      }
      if (item.quantity > variant.stock) {
        problems.push({
          item: `${variant.product.title} — ${variant.name}`,
          available: variant.stock,
          requested: item.quantity,
        });
      }
      lines.push({
        variantId: variant.id,
        titleSnapshot: `${variant.product.title} — ${variant.name}`,
        priceSnapshot: variant.price,
        quantity: item.quantity,
      });
    }

    if (problems.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Some items are no longer available in the requested quantity',
        problems,
      });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.priceSnapshot * l.quantity, 0);
    const shipping = this.shipping.amountFor(rate, subtotal);
    const tax = settings.taxEnabled ? taxForSubtotal(subtotal, settings.taxRateBps) : 0;

    return {
      cartId: cart.id,
      userId: cart.userId,
      lines,
      subtotal,
      shipping,
      shippingFree: shipping === 0,
      shippingRateName: rate.name,
      tax,
      taxLabel: settings.taxLabel,
      total: subtotal + shipping + tax,
      currency: settings.currency,
    };
  }

  private async placeCodOrder(
    plan: OrderPlan,
    input: CheckoutInput,
  ): Promise<CheckoutResult> {
    const order = await this.prisma.$transaction(async (tx) => {
      for (const line of plan.lines) {
        const res = await tx.variant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (res.count !== 1) {
          throw new ConflictException('An item just went out of stock — please review your cart');
        }
      }

      const created = await tx.order.create({
        data: {
          userId: plan.userId,
          email: input.email,
          status: 'pending',
          paymentMethod: 'cod',
          currency: plan.currency,
          subtotal: plan.subtotal,
          shipping: plan.shipping,
          tax: plan.tax,
          total: plan.total,
          shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
          items: { create: plan.lines },
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: plan.cartId } });
      return created;
    });

    await this.mail.sendOrderConfirmation({
      to: input.email,
      orderId: order.id,
      paymentMethod: 'cod',
      items: plan.lines,
      subtotal: plan.subtotal,
      shipping: plan.shipping,
      tax: plan.tax,
      total: plan.total,
      currency: plan.currency,
      shippingAddress: input.shippingAddress,
    });

    return { paymentMethod: 'cod', orderId: order.id };
  }

  private async startStripeCheckout(
    plan: OrderPlan,
    input: CheckoutInput,
    userId: string | null,
  ): Promise<CheckoutResult> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = plan.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: plan.currency,
        unit_amount: l.priceSnapshot,
        product_data: { name: l.titleSnapshot },
      },
    }));
    if (plan.tax > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.tax,
          product_data: { name: plan.taxLabel },
        },
      });
    }

    const session = await this.stripe.client.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.email,
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: plan.shipping, currency: plan.currency },
            display_name: plan.shippingFree ? 'Free shipping' : plan.shippingRateName,
          },
        },
      ],
      success_url: `${this.webOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.webOrigin}/checkout`,
      expires_at: Math.floor(Date.now() / 1000) + this.sessionTtlSeconds,
      metadata: { cartId: plan.cartId, shippingRateId: input.shippingRateId },
    });

    if (!session.url) {
      throw new BadRequestException('Could not start the payment session');
    }

    await this.prisma.pendingCheckout.create({
      data: {
        stripeSessionId: session.id,
        userId,
        email: input.email,
        shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
        shippingRateId: input.shippingRateId,
        cartId: plan.cartId,
        currency: plan.currency,
        subtotal: plan.subtotal,
        shipping: plan.shipping,
        tax: plan.tax,
        total: plan.total,
        lineItems: plan.lines as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + this.sessionTtlSeconds * 1000),
      },
    });

    return { paymentMethod: 'stripe', checkoutUrl: session.url };
  }
}
