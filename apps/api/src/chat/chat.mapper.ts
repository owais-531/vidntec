import type { OrderDetail } from '@vidntec/shared';

/** Slim order-status shape safe to hand to the LLM — no email or shipping
 *  address (unlike the full OrderDetail this is derived from), since that's
 *  more PII than a chat tool result needs to carry. */
export interface ChatOrderStatus {
  status: string;
  items: { title: string; quantity: number }[];
  total: number;
  currency: string;
  trackingNumber: string | null;
  createdAt: string;
}

export function toChatOrderStatus(detail: OrderDetail): ChatOrderStatus {
  return {
    status: detail.status,
    items: detail.items.map((i) => ({ title: i.titleSnapshot, quantity: i.quantity })),
    total: detail.total,
    currency: detail.currency,
    trackingNumber: detail.trackingNumber,
    createdAt: detail.createdAt,
  };
}
