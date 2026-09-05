'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { trackOrderAction } from '@/lib/orders/actions';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

export function TrackOrderForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    setError(undefined);
    start(async () => {
      const res = await trackOrderAction({ reference: reference.trim(), email: email.trim() });
      if (res.ok) {
        router.push(`/orders/${res.orderId}?email=${encodeURIComponent(email.trim())}`);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <Field
          label="Order number or tracking number"
          htmlFor="reference"
          hint="Your order number is on the confirmation page and email."
        >
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            autoComplete="off"
            placeholder="e.g. A1B2C3D4"
          />
        </Field>

        <Field label="Email" htmlFor="email" hint="The email you used at checkout.">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>

        {error ? (
          <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">{error}</p>
        ) : null}

        <Button
          className="w-full"
          onClick={submit}
          disabled={pending || !reference.trim() || !email.trim()}
        >
          {pending ? 'Looking up…' : 'Track order'}
        </Button>
      </CardBody>
    </Card>
  );
}
