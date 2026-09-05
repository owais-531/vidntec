import { formatMoney, formatOrderDateTime, orderNumber, type OrderDetail } from '@vidntec/shared';
import { Card, CardBody } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/order-status-badge';

export function OrderView({ order }: { order: OrderDetail }) {
  const a = order.shippingAddress;
  const placed = formatOrderDateTime(order.createdAt);

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Order #{orderNumber(order.id)}</p>
            <p className="text-xs text-ink-muted">
              Placed {placed} · {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card'}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </CardBody>
      </Card>

      <Card>
        <div className="divide-y divide-paper-line px-5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <span>
                {item.titleSnapshot}
                <span className="text-ink-muted"> × {item.quantity}</span>
              </span>
              <span className="font-medium">{formatMoney(item.lineTotal, order.currency)}</span>
            </div>
          ))}
        </div>
        <CardBody className="space-y-1.5 border-t border-paper-line text-sm">
          <Row label="Subtotal">{formatMoney(order.subtotal, order.currency)}</Row>
          <Row label="Shipping">
            {order.shipping === 0 ? 'Free' : formatMoney(order.shipping, order.currency)}
          </Row>
          {order.tax > 0 ? <Row label="Tax">{formatMoney(order.tax, order.currency)}</Row> : null}
          <div className="flex justify-between border-t border-paper-line pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.total, order.currency)}</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Ship to
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              {a.name}
              <br />
              {a.line1}
              {a.line2 ? (
                <>
                  <br />
                  {a.line2}
                </>
              ) : null}
              <br />
              {a.city}
              {a.state ? `, ${a.state}` : ''}
              {a.postalCode ? ` ${a.postalCode}` : ''}
              <br />
              {a.country}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Shipment
            </h3>
            {order.trackingNumber ? (
              <p className="text-sm text-ink-soft">
                Tracking number
                <br />
                <span className="font-mono text-ink">{order.trackingNumber}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-muted">Not shipped yet.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-soft">{label}</span>
      <span>{children}</span>
    </div>
  );
}
