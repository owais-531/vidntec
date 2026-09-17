import { formatMoney, orderNumber } from '@vidntec/shared';
import type { ShippingAddress } from '@vidntec/shared';

interface Line {
  titleSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  customNameSnapshot?: string | null;
  customColorLabelSnapshot?: string | null;
}

interface OrderEmailData {
  orderId: string;
  paymentMethod: 'stripe' | 'cod';
  items: Line[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: ShippingAddress;
}

const wrap = (title: string, body: string) => `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1f1f1f">
  <h1 style="font-size:18px;color:#8a1a1c;margin:0 0 4px">⚡ VIDNTEC</h1>
  <h2 style="font-size:16px;margin:16px 0 12px">${title}</h2>
  ${body}
  <p style="font-size:12px;color:#8a8a8a;margin-top:24px">3D-printed products, made to order.</p>
</div>`;

function lineRows(items: Line[], currency: string): string {
  return items
    .map((l) => {
      const personalization = [l.customNameSnapshot, l.customColorLabelSnapshot]
        .filter(Boolean)
        .join(', ');
      return `<tr>
        <td style="padding:6px 0">${escapeHtml(l.titleSnapshot)} × ${l.quantity}${
          personalization
            ? `<br /><span style="color:#8a8a8a;font-size:12px">${escapeHtml(personalization)}</span>`
            : ''
        }</td>
        <td style="padding:6px 0;text-align:right">${formatMoney(l.priceSnapshot * l.quantity, currency)}</td>
      </tr>`;
    })
    .join('');
}

function totals(d: OrderEmailData): string {
  const row = (label: string, value: number) =>
    `<tr><td style="padding:2px 0;color:#4a4a4a">${label}</td><td style="padding:2px 0;text-align:right">${formatMoney(value, d.currency)}</td></tr>`;
  return `<table style="width:100%;font-size:14px;border-top:1px solid #ececec;margin-top:8px;padding-top:8px">
    ${row('Subtotal', d.subtotal)}
    ${row('Shipping', d.shipping)}
    ${d.tax > 0 ? row('Tax', d.tax) : ''}
    <tr><td style="padding:6px 0;font-weight:600">Total</td><td style="padding:6px 0;text-align:right;font-weight:600">${formatMoney(d.total, d.currency)}</td></tr>
  </table>`;
}

function address(a: ShippingAddress): string {
  return [
    escapeHtml(a.name),
    escapeHtml(a.line1),
    a.line2 ? escapeHtml(a.line2) : '',
    `${escapeHtml(a.city)}${a.state ? `, ${escapeHtml(a.state)}` : ''}${a.postalCode ? ` ${escapeHtml(a.postalCode)}` : ''}`,
    escapeHtml(a.country),
  ]
    .filter(Boolean)
    .join('<br>');
}

export function orderConfirmationEmail(d: OrderEmailData): { subject: string; html: string } {
  const num = orderNumber(d.orderId);
  const intro =
    d.paymentMethod === 'cod'
      ? `Thanks for your order. You'll pay <strong>on delivery</strong>. We'll be in touch to arrange it.`
      : `Thanks for your order — your payment was received and we're getting it ready.`;
  return {
    subject: `Order ${num} confirmed`,
    html: wrap(
      `Order ${num} confirmed`,
      `<p style="font-size:14px">${intro}</p>
       <table style="width:100%;font-size:14px">${lineRows(d.items, d.currency)}</table>
       ${totals(d)}
       <p style="font-size:13px;color:#4a4a4a;margin-top:16px"><strong>Ship to</strong><br>${address(d.shippingAddress)}</p>`,
    ),
  };
}

export function shippingNotificationEmail(d: {
  orderId: string;
  trackingNumber: string;
  items: Line[];
  currency: string;
}): { subject: string; html: string } {
  const num = orderNumber(d.orderId);
  return {
    subject: `Order ${num} has shipped`,
    html: wrap(
      `Order ${num} is on its way`,
      `<p style="font-size:14px">Your order has shipped.</p>
       <p style="font-size:14px"><strong>Tracking number:</strong> ${escapeHtml(d.trackingNumber)}</p>
       <table style="width:100%;font-size:14px;margin-top:8px">${lineRows(d.items, d.currency)}</table>`,
    ),
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Reset your VIDNTEC password',
    html: wrap(
      'Reset your password',
      `<p style="font-size:14px">Click below to set a new password. This link expires in 1 hour. If you didn't request it, ignore this email.</p>
       <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#8a1a1c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px">Reset password</a></p>`,
    ),
  };
}

export function verificationOtpEmail(code: string): { subject: string; html: string } {
  return {
    subject: 'Verify your VIDNTEC email',
    html: wrap(
      'Verify your email',
      `<p style="font-size:14px">Enter this code to verify your email and finish creating your account. It expires in 10 minutes.</p>
       <p style="font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;margin:20px 0;padding:12px;background:#f2f2f3;border-radius:6px">${escapeHtml(code)}</p>
       <p style="font-size:13px;color:#8a8a8a">If you didn't try to create an account, you can ignore this email.</p>`,
    ),
  };
}

const REFUND_REQUEST_REASON_LABELS: Record<string, string> = {
  damaged: 'Damaged',
  defective: 'Defective',
  wrong_item: 'Wrong item received',
  other: 'Other',
};

export function refundRequestNotificationEmail(d: {
  name: string;
  email: string;
  phone: string;
  orderReference: string;
  orderId: string;
  reason: string;
  details: string;
  photos: { url: string }[];
}): { subject: string; html: string } {
  const photos = d.photos.length
    ? `<p style="font-size:14px;margin:16px 0 8px"><strong>Photos</strong></p>
       <div>${d.photos
         .map(
           (p) =>
             `<a href="${escapeHtml(p.url)}" style="display:inline-block;margin:0 8px 8px 0">
                <img src="${escapeHtml(p.url)}" width="120" height="120" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ececec" />
              </a>`,
         )
         .join('')}</div>`
    : '';
  return {
    subject: `Refund request — order ${escapeHtml(d.orderReference)}`,
    html: wrap(
      'New refund request',
      `<table style="width:100%;font-size:14px">
         <tr><td style="padding:4px 0;color:#4a4a4a;width:120px">Order</td><td style="padding:4px 0"><a href="https://vidntec.com/orders/${escapeHtml(d.orderId)}">${escapeHtml(d.orderReference)}</a></td></tr>
         <tr><td style="padding:4px 0;color:#4a4a4a">Name</td><td style="padding:4px 0">${escapeHtml(d.name)}</td></tr>
         <tr><td style="padding:4px 0;color:#4a4a4a">Email</td><td style="padding:4px 0">${escapeHtml(d.email)}</td></tr>
         <tr><td style="padding:4px 0;color:#4a4a4a">Phone</td><td style="padding:4px 0">${escapeHtml(d.phone)}</td></tr>
         <tr><td style="padding:4px 0;color:#4a4a4a">Reason</td><td style="padding:4px 0">${escapeHtml(REFUND_REQUEST_REASON_LABELS[d.reason] ?? d.reason)}</td></tr>
       </table>
       <p style="font-size:14px;margin:16px 0 4px"><strong>Details</strong></p>
       <p style="font-size:14px;white-space:pre-line">${escapeHtml(d.details)}</p>
       ${photos}`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
