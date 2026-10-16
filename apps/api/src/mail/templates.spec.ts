import { describe, expect, it } from 'vitest';
import { orderConfirmationEmail } from './templates';

const base = {
  orderId: 'cmabc123456789',
  paymentMethod: 'cod' as const,
  subtotal: 219900,
  shipping: 0,
  tax: 0,
  total: 219900,
  currency: 'pkr',
  shippingAddress: { name: 'A', line1: 'x', city: 'Lahore', state: 'Punjab', country: 'PK' },
};

describe('order confirmation email personalization', () => {
  it('lists "Label: value" under the line and escapes HTML', () => {
    const { html } = orderConfirmationEmail({
      ...base,
      items: [
        {
          titleSnapshot: 'Name Frame — Standard',
          priceSnapshot: 219900,
          quantity: 1,
          personalization: [
            { label: 'Name', value: 'Ali <b>' },
            { label: 'Gift wrap', value: 'Yes' },
          ],
        },
      ],
    });
    expect(html).toContain('Name: Ali &lt;b&gt;, Gift wrap: Yes');
    expect(html).not.toContain('<b>');
  });

  it('adds nothing for a line with no personalization', () => {
    const { html } = orderConfirmationEmail({
      ...base,
      items: [{ titleSnapshot: 'Plain', priceSnapshot: 100, quantity: 1, personalization: [] }],
    });
    expect(html).not.toContain('font-size:12px">');
  });
});
