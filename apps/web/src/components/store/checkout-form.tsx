'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { PAKISTAN_REGIONS, formatMoney, type CartView, type Quote } from '@vidntec/shared';
import { checkoutAction, quoteAction } from '@/lib/checkout/actions';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';

// Online payment (Stripe) is disabled until a PKR gateway is wired — see M9.
// Checkout is Cash on Delivery only for now.
const PAYMENT_METHOD = 'cod' as const;

const OTHER_CITY = '__other__';

export function CheckoutForm({
  cart,
  defaultEmail,
}: {
  cart: CartView;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [email, setEmail] = useState(defaultEmail);
  const [addr, setAddr] = useState({
    name: '',
    line1: '',
    line2: '',
    postalCode: '',
    country: 'PK',
  });
  const [regionId, setRegionId] = useState('');
  const [citySelect, setCitySelect] = useState('');
  const [otherCity, setOtherCity] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const setField = (k: keyof typeof addr, v: string) => setAddr((a) => ({ ...a, [k]: v }));

  const region = PAKISTAN_REGIONS.find((r) => r.id === regionId);
  const city = citySelect === OTHER_CITY ? otherCity.trim() : citySelect;

  useEffect(() => {
    if (!city) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    quoteAction(city).then((res) => {
      if (!cancelled && res.ok) setQuote(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [city]);

  const submit = () => {
    setError(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const res = await checkoutAction({
        email: email.trim(),
        shippingAddress: {
          name: addr.name.trim(),
          line1: addr.line1.trim(),
          ...(addr.line2.trim() ? { line2: addr.line2.trim() } : {}),
          city,
          state: region?.name ?? '',
          ...(addr.postalCode.trim() ? { postalCode: addr.postalCode.trim() } : {}),
          country: addr.country.trim().toUpperCase(),
        },
        paymentMethod: PAYMENT_METHOD,
      });

      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      if (res.data.paymentMethod === 'cod') {
        router.push(
          `/checkout/success?order=${res.data.orderId}&email=${encodeURIComponent(email.trim())}`,
        );
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-sm font-semibold">Contact</h2>
            <Field label="Email" htmlFor="email" required error={fieldErrors.email?.[0]}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-sm font-semibold">Shipping address</h2>
            <Field label="Full name" required error={fieldErrors['shippingAddress.name']?.[0]}>
              <Input value={addr.name} onChange={(e) => setField('name', e.target.value)} />
            </Field>
            <Field label="Address line 1" required error={fieldErrors['shippingAddress.line1']?.[0]}>
              <Input value={addr.line1} onChange={(e) => setField('line1', e.target.value)} />
            </Field>
            <Field label="Address line 2 (optional)">
              <Input value={addr.line2} onChange={(e) => setField('line2', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Province"
                required
                error={fieldErrors['shippingAddress.state']?.[0]}
              >
                <Select
                  value={regionId}
                  onChange={(e) => {
                    setRegionId(e.target.value);
                    setCitySelect('');
                    setOtherCity('');
                  }}
                >
                  <option value="">Select province</option>
                  {PAKISTAN_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="City" required error={fieldErrors['shippingAddress.city']?.[0]}>
                <Select
                  value={citySelect}
                  onChange={(e) => {
                    setCitySelect(e.target.value);
                    setOtherCity('');
                  }}
                  disabled={!region}
                >
                  <option value="">{region ? 'Select city' : 'Select a province first'}</option>
                  {region?.cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {region ? <option value={OTHER_CITY}>Other (type your city)</option> : null}
                </Select>
              </Field>
              {citySelect === OTHER_CITY ? (
                <div className="col-span-2">
                  <Field label="City name" required>
                    <Input value={otherCity} onChange={(e) => setOtherCity(e.target.value)} />
                  </Field>
                </div>
              ) : null}
              <Field
                label="Postal code (optional)"
                error={fieldErrors['shippingAddress.postalCode']?.[0]}
              >
                <Input
                  value={addr.postalCode}
                  onChange={(e) => setField('postalCode', e.target.value)}
                />
              </Field>
              <Field label="Country" hint="We currently ship within Pakistan only">
                <Input value="Pakistan" disabled readOnly />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1">
            <h2 className="text-sm font-semibold">Payment</h2>
            <p className="text-sm font-medium">Cash on Delivery</p>
            <p className="text-xs text-ink-muted">Pay in cash when your order arrives.</p>
          </CardBody>
        </Card>
      </div>

      <div>
        <Card className="lg:sticky lg:top-6">
          <CardBody className="space-y-3">
            <h2 className="text-sm font-semibold">Order summary</h2>
            <div className="space-y-1.5 text-sm">
              <Row label={`Subtotal (${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'})`}>
                {formatMoney(quote?.subtotal ?? cart.subtotal)}
              </Row>
              <Row label="Shipping">
                {quote ? (quote.shippingFree ? 'Free' : formatMoney(quote.shipping)) : '—'}
              </Row>
              {quote && quote.tax > 0 ? (
                <Row label={quote.taxLabel}>{formatMoney(quote.tax)}</Row>
              ) : null}
            </div>
            <div className="flex justify-between border-t border-paper-line pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{quote ? formatMoney(quote.total) : '—'}</span>
            </div>

            {error ? (
              <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
                {error}{' '}
                <Link href="/cart" className="font-semibold underline">
                  Review cart
                </Link>
              </p>
            ) : null}

            <Button className="w-full" onClick={submit} disabled={pending || !quote}>
              {pending ? 'Processing…' : 'Place order'}
            </Button>
            <Link
              href="/cart"
              className="block text-center text-xs text-ink-muted hover:text-ink"
            >
              Back to cart
            </Link>
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
