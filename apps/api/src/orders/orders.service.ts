import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminOrderListItem,
  AdminOrderListQuery,
  OrderDetail,
  OrderSummary,
} from '@vidntec/shared';
import type { OrderItem, Prisma } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { MailService } from '../mail/mail.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  toAdminListItem,
  toOrderDetail,
  toOrderSummary,
  type OrderWithItems,
} from './orders.mapper';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly mail: MailService,
  ) {}

  // ── customer ──────────────────────────────────────────────────────────────

  async getForCustomer(
    id: string,
    user: AuthenticatedUser | undefined,
    email: string | undefined,
  ): Promise<OrderDetail> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    // 404 (not 403) for every access failure so order ids can't be probed.
    if (!order) throw new NotFoundException('Order not found');

    if (order.userId) {
      if (!user || user.id !== order.userId) throw new NotFoundException('Order not found');
    } else {
      if (!email || email.trim().toLowerCase() !== order.email.toLowerCase()) {
        throw new NotFoundException('Order not found');
      }
    }
    return toOrderDetail(order);
  }

  /**
   * Guest order tracking. Matches a *guest* order (userId null) where the email
   * matches AND `reference` is either the tail of the order id (the order number
   * we show the customer) or the courier tracking number. 404 on any miss so
   * order references can't be probed.
   */
  async lookup(reference: string, email: string): Promise<{ orderId: string }> {
    const ref = reference.trim();
    const mail = email.trim().toLowerCase();
    if (ref.length < 4) throw new NotFoundException('Order not found');

    const order = await this.prisma.order.findFirst({
      where: {
        userId: null,
        email: { equals: mail, mode: 'insensitive' },
        OR: [
          { id: { endsWith: ref.toLowerCase() } },
          { trackingNumber: { equals: ref, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { orderId: order.id };
  }

  async listForUser(userId: string): Promise<OrderSummary[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toOrderSummary);
  }

  // ── admin: reads ──────────────────────────────────────────────────────────

  async adminList(query: AdminOrderListQuery): Promise<{
    items: AdminOrderListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: rows.map(toAdminListItem), total, page: query.page, pageSize: query.pageSize };
  }

  async adminGet(id: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    return toOrderDetail(order);
  }

  // ── admin: transitions ────────────────────────────────────────────────────

  /** Statuses for which the order's items are currently deducted from stock. */
  private static readonly STOCK_HELD: ReadonlySet<string> = new Set([
    'pending',
    'confirmed',
    'fulfilled',
    'delivered',
  ]);

  /**
   * Manual admin override — set an order to any status. Intentionally skips the
   * guarded flow: no shipping email, no Stripe refund. It DOES keep inventory
   * honest: moving into cancelled/refunded restocks the items; moving back to an
   * active status re-deducts them (and fails if stock is insufficient).
   */
  async setStatus(id: string, status: OrderWithItems['status']): Promise<OrderDetail> {
    const order = await this.load(id);
    if (order.status === status) return toOrderDetail(order);

    const wasHeld = OrdersService.STOCK_HELD.has(order.status);
    const nowHeld = OrdersService.STOCK_HELD.has(status);

    return this.prisma.$transaction(async (tx) => {
      if (wasHeld && !nowHeld) {
        await this.restock(tx, order.items);
      } else if (!wasHeld && nowHeld) {
        await this.deduct(tx, order.items);
      }
      await tx.order.update({ where: { id }, data: { status } });
      const fresh = await tx.order.findUnique({ where: { id }, include: { items: true } });
      return toOrderDetail(fresh!);
    });
  }

  /** Admin accepts a pending order. COD orders are not paid up front — this just confirms it. */
  async confirmOrder(id: string): Promise<OrderDetail> {
    const order = await this.load(id);
    if (order.paymentMethod !== 'cod') {
      throw new BadRequestException('Only Cash-on-Delivery orders are confirmed manually');
    }
    if (order.status !== 'pending') {
      throw new ConflictException(`Cannot confirm a ${order.status} order`);
    }
    return this.updateAndReturn(id, { status: 'confirmed' });
  }

  async fulfill(id: string, trackingNumber: string): Promise<OrderDetail> {
    const order = await this.load(id);
    if (order.status !== 'confirmed') {
      throw new ConflictException(
        order.status === 'pending'
          ? 'Confirm the order before fulfilling it'
          : `Cannot fulfil a ${order.status} order`,
      );
    }

    const updated = await this.updateAndReturn(id, { status: 'fulfilled', trackingNumber });

    await this.mail.sendShippingNotification({
      to: order.email,
      orderId: order.id,
      trackingNumber,
      items: order.items,
      currency: order.currency,
    });
    return updated;
  }

  async markDelivered(id: string): Promise<OrderDetail> {
    const order = await this.load(id);
    if (order.status !== 'fulfilled') {
      throw new ConflictException(
        order.status === 'confirmed'
          ? 'Fulfil the order before marking it delivered'
          : `Cannot mark a ${order.status} order delivered`,
      );
    }
    return this.updateAndReturn(id, { status: 'delivered' });
  }

  /**
   * Permanently delete an order + its items (order-history cleanup). Does NOT
   * touch inventory or issue refunds — cancel/refund the order first if the
   * stock needs to come back.
   */
  async remove(id: string): Promise<void> {
    await this.load(id); // 404 if it doesn't exist
    await this.prisma.order.delete({ where: { id } }); // order_items cascade
  }

  async cancel(id: string): Promise<OrderDetail> {
    const order = await this.load(id);
    if (order.paymentMethod !== 'cod') {
      throw new BadRequestException('Use refund for card orders');
    }
    if (order.status !== 'pending') {
      throw new ConflictException(`Cannot cancel a ${order.status} order`);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.restock(tx, order.items);
      await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
      const fresh = await tx.order.findUnique({ where: { id }, include: { items: true } });
      return toOrderDetail(fresh!);
    });
  }

  async refund(id: string, reason?: string): Promise<OrderDetail> {
    const order = await this.load(id);
    if (order.paymentMethod !== 'stripe' || !order.stripePaymentIntentId) {
      throw new BadRequestException('Only card orders can be refunded via Stripe');
    }
    if (!['confirmed', 'fulfilled', 'delivered'].includes(order.status)) {
      throw new ConflictException(`Cannot refund a ${order.status} order`);
    }

    await this.stripe.client.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      ...(reason ? { metadata: { reason } } : {}),
    });

    const restock = order.status === 'confirmed'; // not yet shipped → return to inventory
    return this.prisma.$transaction(async (tx) => {
      if (restock) await this.restock(tx, order.items);
      await tx.order.update({ where: { id }, data: { status: 'refunded' } });
      const fresh = await tx.order.findUnique({ where: { id }, include: { items: true } });
      return toOrderDetail(fresh!);
    });
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async load(id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async updateAndReturn(
    id: string,
    data: { status: OrderWithItems['status']; trackingNumber?: string },
  ): Promise<OrderDetail> {
    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });
    return toOrderDetail(updated);
  }

  private async restock(tx: Prisma.TransactionClient, items: OrderItem[]): Promise<void> {
    for (const item of items) {
      if (!item.variantId) continue;
      await tx.variant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  /** Guarded decrement — used when a manual override moves an order back to an active status. */
  private async deduct(tx: Prisma.TransactionClient, items: OrderItem[]): Promise<void> {
    for (const item of items) {
      if (!item.variantId) continue;
      const res = await tx.variant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (res.count !== 1) {
        throw new ConflictException(
          'Not enough stock to move this order back to an active status',
        );
      }
    }
  }
}
