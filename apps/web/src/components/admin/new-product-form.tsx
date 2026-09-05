'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PRODUCT_STATUSES, type CreateProductInput } from '@vidntec/shared';
import { createProductAction } from '@/lib/actions/catalog';
import { inputToCents } from '@/lib/money-input';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { toast } from '@/components/ui/toast';

interface VariantRow {
  name: string;
  price: string;
  compareAt: string;
  sku: string;
  stock: string;
}

const emptyRow = (): VariantRow => ({ name: '', price: '', compareAt: '', sku: '', stock: '0' });

const VGRID = 'grid grid-cols-[1fr_6.5rem_6.5rem_1fr_4.5rem_auto] items-center gap-2';

export function NewProductForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [featured, setFeatured] = useState(false);
  const [rows, setRows] = useState<VariantRow[]>([emptyRow()]);

  const setRow = (i: number, patch: Partial<VariantRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const submit = () => {
    setError(undefined);
    setFieldErrors({});

    const variants: CreateProductInput['variants'] = [];
    for (const [i, row] of rows.entries()) {
      const cents = inputToCents(row.price);
      if (!row.name.trim() || cents === null || !row.sku.trim()) {
        setError(`Variant ${i + 1}: name, a valid price and SKU are required.`);
        return;
      }
      let compareAtPrice: number | null = null;
      if (row.compareAt.trim()) {
        const c = inputToCents(row.compareAt);
        if (c === null) {
          setError(`Variant ${i + 1}: “was” price is not valid.`);
          return;
        }
        compareAtPrice = c;
      }
      variants.push({
        name: row.name.trim(),
        price: cents,
        compareAtPrice,
        sku: row.sku.trim(),
        stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
      });
    }

    const input: CreateProductInput = {
      title: title.trim(),
      description: description.trim(),
      status,
      featured,
      variants,
      ...(slug.trim() ? { slug: slug.trim() } : {}),
    };

    startTransition(async () => {
      const res = await createProductAction(input);
      if (res.ok) {
        toast('Product created');
        router.push(`/admin/products/${res.data.id}`);
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <Field label="Title" htmlFor="title" error={fieldErrors.title?.[0]}>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field
            label="Slug"
            htmlFor="slug"
            hint="Leave blank to generate from the title"
            error={fieldErrors.slug?.[0]}
          >
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto"
            />
          </Field>
          <Field label="Description" htmlFor="description" error={fieldErrors.description?.[0]}>
            <RichTextEditor id="description" value={description} onChange={setDescription} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0]!.toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="accent-brand-500"
            />
            Trending — show in the storefront “Trending” section
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Variants</h2>
            <Button size="sm" variant="secondary" onClick={() => setRows((r) => [...r, emptyRow()])}>
              + Add variant
            </Button>
          </div>
          <div className={`${VGRID} px-1 text-xs font-medium uppercase tracking-wide text-ink-muted`}>
            <span>Name</span>
            <span>Price</span>
            <span>Was</span>
            <span>SKU</span>
            <span>Stock</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className={VGRID}>
              <Input
                placeholder="Name"
                value={row.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
              <Input
                placeholder="Price"
                inputMode="decimal"
                value={row.price}
                onChange={(e) => setRow(i, { price: e.target.value })}
              />
              <Input
                placeholder="Was"
                inputMode="decimal"
                value={row.compareAt}
                onChange={(e) => setRow(i, { compareAt: e.target.value })}
              />
              <Input
                placeholder="SKU"
                value={row.sku}
                onChange={(e) => setRow(i, { sku: e.target.value })}
              />
              <Input
                placeholder="Stock"
                inputMode="numeric"
                value={row.stock}
                onChange={(e) => setRow(i, { stock: e.target.value })}
              />
              <button
                type="button"
                disabled={rows.length === 1}
                onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                className="px-2 text-ink-muted hover:text-brand-600 disabled:opacity-30"
                aria-label="Remove variant"
              >
                ✕
              </button>
            </div>
          ))}
          <p className="text-xs text-ink-muted">
            Prices in rupees (PKR). “Was” is optional — set it above the price to show a sale.
            Images are added after saving.
          </p>
        </CardBody>
      </Card>

      {error ? (
        <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">{error}</p>
      ) : null}

      <div className="flex gap-3">
        <Button onClick={submit} disabled={pending || !title.trim()}>
          {pending ? 'Creating…' : 'Create product'}
        </Button>
      </div>
    </div>
  );
}
