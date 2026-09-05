'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { StoreSettings } from '@vidntec/shared';
import { updateSettingsAction } from '@/lib/actions/settings';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [currency, setCurrency] = useState(settings.currency);
  const [taxEnabled, setTaxEnabled] = useState(settings.taxEnabled);
  const [taxLabel, setTaxLabel] = useState(settings.taxLabel);
  const [taxPercent, setTaxPercent] = useState((settings.taxRateBps / 100).toString());
  const [error, setError] = useState<string>();

  const save = () => {
    setError(undefined);
    const pct = Number(taxPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError('Tax rate must be between 0 and 100.');
      return;
    }
    start(async () => {
      const res = await updateSettingsAction({
        storeName: storeName.trim(),
        supportEmail: supportEmail.trim(),
        currency: currency.trim().toLowerCase(),
        taxEnabled,
        taxLabel: taxLabel.trim(),
        taxRateBps: Math.round(pct * 100),
      });
      if (res.ok) {
        toast('Settings saved');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold">Store</h2>
          <Field label="Store name">
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </Field>
          <Field label="Support email" hint="Shown in emails and the footer">
            <Input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </Field>
          <Field
            label="Currency (3-letter code)"
            hint="Changing this affects how all prices and past orders display"
          >
            <Input
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toLowerCase())}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold">Tax</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
              className="accent-brand-500"
            />
            Charge tax on orders
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tax label" hint="e.g. “Sales tax”, “VAT”">
              <Input
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
                disabled={!taxEnabled}
              />
            </Field>
            <Field label="Tax rate (%)">
              <Input
                inputMode="decimal"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                disabled={!taxEnabled}
              />
            </Field>
          </div>
          <p className="text-xs text-ink-muted">
            Applied to the order subtotal (not shipping). Swap in Stripe Tax later without changing
            the checkout flow.
          </p>
        </CardBody>
      </Card>

      {error ? (
        <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">{error}</p>
      ) : null}

      <Button onClick={save} disabled={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  );
}
