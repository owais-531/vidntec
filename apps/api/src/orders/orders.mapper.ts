import type {
  AdminOrderListItem,
  OrderDetail,
  OrderSummary,
  ShippingAddress,
} from '@vidntec/shared';
import type { Order, OrderItem, Prisma } from '@vidntec/shared/prisma';

export type OrderWithItems = Order & { items: OrderItem[] };

export function toOrderDetail(order: OrderWithItems): OrderDetail {
  return {
    id: order.id,
    email: order.email,
    userId: order.userId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    shippingAddress: order.shippingAddress as Prisma.JsonValue as unknown as ShippingAddress,
    trackingNumber: order.trackingNumber,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      titleSnapshot: i.titleSnapshot,
      priceSnapshot: i.priceSnapshot,
      quantity: i.quantity,
      lineTotal: i.priceSnapshot * i.quantity,
    })),
  };
}

export function toOrderSummary(order: OrderWithItems): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    total: order.total,
    itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: order.createdAt.toISOString(),
  };
}

export function toAdminListItem(order: OrderWithItems): AdminOrderListItem {
  return { ...toOrderSummary(order), email: order.email };
}
