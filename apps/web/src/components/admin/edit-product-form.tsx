'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  PRODUCT_STATUSES,
  type AdminCategory,
  type AdminProduct,
  type CustomizationColorOption,
  type ProductSpec,
} from '@vidntec/shared';
import { deleteProductAction, updateProductAction } from '@/lib/actions/catalog';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { CustomizationFields } from '@/components/admin/customization-fields';
import { SpecFields } from '@/components/admin/spec-fields';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

function sameColorOptions(a: CustomizationColorOption[], b: CustomizationColorOption[]): boolean {
  return a.length === b.length && a.every((o, i) => o.label === b[i]!.label && o.hex === b[i]!.hex);
}

function sameSpecs(a: ProductSpec[], b: ProductSpec[]): boolean {
  return a.length === b.length && a.every((s, i) => s.label === b[i]!.label && s.value === b[i]!.value);
}

export function EditProductForm({
  product,
  categories,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [title, setTitle] = useState(product.title);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState(product.status);
  const [featured, setFeatured] = useState(product.featured);
  const [categoryId, setCategoryId] = useState(product.categoryId ?? '');
  const [customizationNameEnabled, setCustomizationNameEnabled] = useState(
    product.customizationNameEnabled,
  );
  const [customizationColorEnabled, setCustomizationColorEnabled] = useState(
    product.customizationColorEnabled,
  );
  const [customizationColorOptions, setCustomizationColorOptions] = useState<
    CustomizationColorOption[]
  >(product.customizationColorOptions);
  const [specs, setSpecs] = useState<ProductSpec[]>(product.specs);

  const dirty =
    title !== product.title ||
    slug !== product.slug ||
    description !== product.description ||
    status !== product.status ||
    featured !== product.featured ||
    categoryId !== (product.categoryId ?? '') ||
    customizationNameEnabled !== product.customizationNameEnabled ||
    customizationColorEnabled !== product.customizationColorEnabled ||
    !sameColorOptions(customizationColorOptions, product.customizationColorOptions) ||
    !sameSpecs(specs, product.specs);

  const save = () => {
    setFieldErrors({});
    const cleanColorOptions = customizationColorOptions
      .map((o) => ({ label: o.label.trim(), hex: o.hex }))
      .filter((o) => o.label);
    if (customizationColorEnabled && cleanColorOptions.length === 0) {
      setFieldErrors({ _: ['Add at least one color option, or turn off color personalization.'] });
      return;
    }
    const cleanSpecs = specs
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label && s.value);
    startTransition(async () => {
      const res = await updateProductAction(product.id, {
        title: title.trim(),
        slug: slug.trim(),
        description,
        status,
        featured,
        categoryId: categoryId || null,
        customizationNameEnabled,
        customizationColorEnabled,
        customizationColorOptions: cleanColorOptions,
        specs: cleanSpecs,
      });
      if (res.ok) toast('Saved');
      else setFieldErrors(res.fieldErrors ?? { _: [res.error] });
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <Field label="Title" htmlFor="title" error={fieldErrors.title?.[0]}>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Slug" htmlFor="slug" error={fieldErrors.slug?.[0]}>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="description" error={fieldErrors.description?.[0]}>
          <RichTextEditor id="description" value={description} onChange={setDescription} />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0]!.toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Category"
          htmlFor="category"
          hint="Optional — uncategorized products still appear in All products and Latest."
        >
          <Select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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

        <div className="border-t border-paper-line pt-4">
          <CustomizationFields
            nameEnabled={customizationNameEnabled}
            onNameEnabledChange={setCustomizationNameEnabled}
            colorEnabled={customizationColorEnabled}
            onColorEnabledChange={setCustomizationColorEnabled}
            colorOptions={customizationColorOptions}
            onColorOptionsChange={setCustomizationColorOptions}
          />
        </div>

        <div className="border-t border-paper-line pt-4">
          <SpecFields specs={specs} onSpecsChange={setSpecs} />
        </div>

        {fieldErrors._?.[0] ? (
          <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
            {fieldErrors._[0]}
          </p>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
          <ConfirmButton
            message="Delete this product?"
            confirmLabel="Delete"
            successMessage="Product deleted"
            action={async () => {
              const res = await deleteProductAction(product.id);
              if (res.ok) router.push('/admin/products');
              return res;
            }}
          >
            Delete product
          </ConfirmButton>
        </div>
      </CardBody>
    </Card>
  );
}
