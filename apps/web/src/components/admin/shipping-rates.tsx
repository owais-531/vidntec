'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ShippingRate } from '@vidntec/shared';
import {
  createShippingRateAction,
  deleteShippingRateAction,
  updateShippingRateAction,
} from '@/lib/actions/settings';
import { inputToCents, centsToInput } from '@/lib/money-input';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

function RateRow({ rate }: { rate: ShippingRate }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(rate.name);
  const [price, setPrice] = useState(centsToInput(rate.price));
  const [free, setFree] = useState(rate.minOrderForFree === null ? '' : centsToInput(rate.minOrderForFree));

  const dirty =
    name !== rate.name ||
    price !== centsToInput(rate.price) ||
    free !== (rate.minOrderForFree === null ? '' : centsToInput(rate.minOrderForFree));

  const save = () => {
    const priceCents = inputToCents(price);
    if (priceCents === null) return toast('Invalid price', 'error');
    const freeCents = free.trim() === '' ? null : inputToCents(free);
    if (free.trim() !== '' && freeCents === null) return toast('Invalid free-shipping threshold', 'error');
    start(async () => {
      const res = await updateShippingRateAction(rate.id, {
        name: name.trim(),
        price: priceCents,
        minOrderForFree: freeCents,
      });
      if (res.ok) {
        toast('Rate saved');
        router.refresh();
      } else toast(res.error, 'error');
    });
  };

  const toggleActive = () =>
    start(async () => {
      const res = await updateShippingRateAction(rate.id, { active: !rate.active });
      if (res.ok) router.refresh();
      else toast(res.error, 'error');
    });

  return (
    <div className={`grid grid-cols-[1fr_7rem_8rem_auto] items-center gap-2 ${pending ? 'opacity-60' : ''}`}>
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Input
        inputMode="decimal"
        placeholder="no free ship"
        value={free}
        onChange={(e) => setFree(e.target.value)}
      />
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          Save
        </Button>
        <Button size="sm" variant="secondary" onClick={toggleActive} disabled={pending}>
          {rate.active ? 'Deactivate' : 'Activate'}
        </Button>
        <ConfirmButton
          message="Delete rate?"
          confirmLabel="Delete"
          successMessage="Rate deleted"
          action={() => deleteShippingRateAction(rate.id)}
        >
          ✕
        </ConfirmButton>
      </div>
    </div>
  );
}

function AddRate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [free, setFree] = useState('');

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + Add rate
      </Button>
    );
  }

  const add = () => {
    const priceCents = inputToCents(price);
    if (!name.trim() || priceCents === null) return toast('Name and a valid price are required', 'error');
    const freeCents = free.trim() === '' ? null : inputToCents(free);
    start(async () => {
      const res = await createShippingRateAction({
        name: name.trim(),
        price: priceCents,
        minOrderForFree: freeCents,
        active: true,
      });
      if (res.ok) {
        toast('Rate added');
        setOpen(false);
        setName('');
        setPrice('');
        setFree('');
        router.refresh();
      } else toast(res.error, 'error');
    });
  };

  return (
    <div className="grid grid-cols-[1fr_7rem_8rem_auto] items-center gap-2 rounded-card bg-paper-sunken p-2">
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Input placeholder="Free over…" inputMode="decimal" value={free} onChange={(e) => setFree(e.target.value)} />
      <div className="flex gap-1">
        <Button size="sm" onClick={add} disabled={pending}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ShippingRates({ rates }: { rates: ShippingRate[] }) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="grid grid-cols-[1fr_7rem_8rem_auto] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          <span>Name</span>
          <span>Price</span>
          <span>Free over</span>
          <span />
        </div>
        {rates.length === 0 ? (
          <p className="text-xs text-ink-muted">No shipping rates. Add one below.</p>
        ) : (
          rates.map((r) => (
            <div key={r.id} className={r.active ? '' : 'opacity-50'}>
              <RateRow rate={r} />
              {!r.active ? <p className="mt-0.5 px-1 text-[10px] text-ink-faint">Inactive — hidden at checkout</p> : null}
            </div>
          ))
        )}
        <AddRate />
        <p className="text-xs text-ink-muted">
          Amounts are in the store currency. Leave “free over” blank for a rate that is never waived.
        </p>
      </CardBody>
    </Card>
  );
}
