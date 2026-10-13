'use client';

import { useState, useTransition } from 'react';
import type { AdminVariant } from '@vidntec/shared';
import {
  addVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from '@/lib/actions/catalog';
import { centsToInput, inputToCents } from '@/lib/money-input';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

/**
 * ONE grid holds the header, every row and the add-row (rows are `display: contents`),
 * so the 1fr/auto columns resolve once and the header labels line up with the inputs.
 * Separate per-row grids don't: the auto-width actions column is empty in the header but
 * holds buttons in a row, which skews the 1fr columns between them.
 */
const GRID = 'grid grid-cols-[1fr_6.5rem_6.5rem_1fr_4.5rem_4rem_auto] items-center gap-2';
const HEADERS = ['Name', 'Price', 'Was', 'SKU', 'Stock', 'Colour', ''];

/** '' → null; otherwise parse. Returns undefined when the string is invalid money. */
function parseOptionalPrice(raw: string): number | null | undefined {
  if (raw.trim() === '') return null;
  return inputToCents(raw) ?? undefined;
}

function compareToInput(cents: number | null): string {
  return cents != null ? centsToInput(cents) : '';
}

/** Colour the AI preview paints this variant in. '' = none (the reference photo's own colour is kept). */
function ColourCell({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value || '#cccccc'}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-9 shrink-0 cursor-pointer rounded border border-paper-line ${value ? '' : 'opacity-40'}`}
        aria-label="Preview colour"
        title={value ? value : 'No preview colour set'}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-ink-muted hover:text-brand-600"
          aria-label="Clear preview colour"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

function VariantRow({
  productId,
  variant,
  canDelete,
}: {
  productId: string;
  variant: AdminVariant;
  canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(variant.name);
  const [price, setPrice] = useState(centsToInput(variant.price));
  const [compareAt, setCompareAt] = useState(compareToInput(variant.compareAtPrice));
  const [sku, setSku] = useState(variant.sku);
  const [stock, setStock] = useState(String(variant.stock));
  const [colour, setColour] = useState(variant.colorHex ?? '');

  const dirty =
    name !== variant.name ||
    price !== centsToInput(variant.price) ||
    compareAt !== compareToInput(variant.compareAtPrice) ||
    sku !== variant.sku ||
    stock !== String(variant.stock) ||
    colour !== (variant.colorHex ?? '');

  const save = () => {
    const cents = inputToCents(price);
    if (cents === null) return toast('Invalid price', 'error');
    const compareCents = parseOptionalPrice(compareAt);
    if (compareCents === undefined) return toast('Invalid “was” price', 'error');
    start(async () => {
      const res = await updateVariantAction(productId, variant.id, {
        name: name.trim(),
        price: cents,
        compareAtPrice: compareCents,
        sku: sku.trim(),
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        colorHex: colour || null,
      });
      toast(res.ok ? 'Variant saved' : res.error, res.ok ? 'success' : 'error');
    });
  };

  return (
    <div className="contents">
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Input
        inputMode="decimal"
        placeholder="—"
        value={compareAt}
        onChange={(e) => setCompareAt(e.target.value)}
      />
      <Input value={sku} onChange={(e) => setSku(e.target.value)} />
      <Input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
      <ColourCell value={colour} onChange={setColour} />
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          Save
        </Button>
        {canDelete ? (
          <ConfirmButton
            message="Delete variant?"
            confirmLabel="Delete"
            successMessage="Variant deleted"
            action={() => deleteVariantAction(productId, variant.id)}
          >
            ✕
          </ConfirmButton>
        ) : null}
      </div>
    </div>
  );
}

function AddVariant({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('0');
  const [colour, setColour] = useState('');

  if (!open) {
    return (
      <div className="col-span-full">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          + Add variant
        </Button>
      </div>
    );
  }

  const add = () => {
    const cents = inputToCents(price);
    if (!name.trim() || cents === null || !sku.trim()) {
      return toast('Name, price and SKU are required', 'error');
    }
    const compareCents = parseOptionalPrice(compareAt);
    if (compareCents === undefined) return toast('Invalid “was” price', 'error');
    start(async () => {
      const res = await addVariantAction(productId, {
        name: name.trim(),
        price: cents,
        compareAtPrice: compareCents,
        sku: sku.trim(),
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        colorHex: colour || null,
      });
      if (res.ok) {
        toast('Variant added');
        setOpen(false);
        setName('');
        setPrice('');
        setCompareAt('');
        setSku('');
        setStock('0');
        setColour('');
      } else {
        toast(res.error, 'error');
      }
    });
  };

  return (
    <div className="contents">
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        placeholder="Price"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <Input
        placeholder="Was"
        inputMode="decimal"
        value={compareAt}
        onChange={(e) => setCompareAt(e.target.value)}
      />
      <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
      <Input
        placeholder="Stock"
        inputMode="numeric"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
      />
      <ColourCell value={colour} onChange={setColour} />
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

export function VariantsEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: AdminVariant[];
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Variants &amp; stock</h2>
        </div>
        <div className={GRID}>
          {HEADERS.map((h, i) => (
            <span
              key={i}
              className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted"
            >
              {h}
            </span>
          ))}
          {variants.map((v) => (
            <VariantRow
              key={v.id}
              productId={productId}
              variant={v}
              canDelete={variants.length > 1}
            />
          ))}
          <p className="col-span-full px-1 text-xs text-ink-muted">
            “Was” is the pre-sale price. Set it above the price to put the variant on sale. “Colour” is only used by the AI name preview — it paints the product in this variant’s colour.
          </p>
          <AddVariant productId={productId} />
        </div>
      </CardBody>
    </Card>
  );
}
