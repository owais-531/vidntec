'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ORDER_STATUSES, type OrderDetail, type OrderStatus } from '@vidntec/shared';
import {
  cancelOrderAction,
  confirmOrderAction,
  fulfillOrderAction,
  markDeliveredAction,
  refundOrderAction,
  setOrderStatusAction,
} from '@/lib/actions/orders';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';
import { DeleteOrderButton } from './delete-order-button';

export function OrderActions({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tracking, setTracking] = useState('');
  const [statusChoice, setStatusChoice] = useState<OrderStatus>(order.status);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast(ok);
        router.refresh();
      } else {
        toast(res.error ?? 'Action failed', 'error');
      }
    });

  const isCod = order.paymentMethod === 'cod';
  const nothing =
    order.status === 'cancelled' || order.status === 'refunded';

  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-sm font-semibold">Actions</h2>

        {nothing ? (
          <p className="text-sm text-ink-muted">
            This order is {order.status}. Use the manual override below to change it.
          </p>
        ) : null}

        {isCod && order.status === 'pending' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => confirmOrderAction(order.id), 'Order confirmed')}
            >
              Confirm order
            </Button>
            <ConfirmButton
              message="Cancel this order?"
              confirmLabel="Cancel order"
              successMessage="Order cancelled"
              action={() => cancelOrderAction(order.id)}
            >
              Cancel order
            </ConfirmButton>
          </div>
        ) : null}

        {order.status === 'confirmed' ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-ink-soft">
              Tracking number
              <Input
                className="mt-1"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
              />
            </label>
            <Button
              size="sm"
              disabled={pending || tracking.trim().length === 0}
              onClick={() =>
                run(() => fulfillOrderAction(order.id, tracking.trim()), 'Marked fulfilled — shipping email sent')
              }
            >
              Mark fulfilled &amp; notify
            </Button>
          </div>
        ) : null}

        {order.status === 'fulfilled' ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => markDeliveredAction(order.id), 'Marked delivered')}
          >
            Mark delivered
          </Button>
        ) : null}

        {order.status === 'delivered' && isCod ? (
          <p className="text-sm text-ink-muted">This order has been delivered.</p>
        ) : null}

        {order.paymentMethod === 'stripe' &&
        (order.status === 'confirmed' ||
          order.status === 'fulfilled' ||
          order.status === 'delivered') ? (
          <ConfirmButton
            message="Refund this order via Stripe?"
            confirmLabel="Refund"
            successMessage="Refunded via Stripe"
            action={() => refundOrderAction(order.id)}
          >
            Refund order
          </ConfirmButton>
        ) : null}

        <div className="space-y-2 border-t border-paper-line pt-4">
          <label className="block text-xs font-medium text-ink-soft">
            Set status (manual override)
            <Select
              className="mt-1 capitalize"
              value={statusChoice}
              onChange={(e) => setStatusChoice(e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || statusChoice === order.status}
            onClick={() => run(() => setOrderStatusAction(order.id, statusChoice), 'Status updated')}
          >
            Update status
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-paper-line pt-4">
          <span className="text-xs text-ink-muted">
            Deleting removes the record only — stock isn’t adjusted.
          </span>
          <DeleteOrderButton orderId={order.id} redirectTo="/admin/orders">
            Delete order
          </DeleteOrderButton>
        </div>
      </CardBody>
    </Card>
  );
}
