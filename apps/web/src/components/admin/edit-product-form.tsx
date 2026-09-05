'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PRODUCT_STATUSES, type AdminProduct } from '@vidntec/shared';
import { deleteProductAction, updateProductAction } from '@/lib/actions/catalog';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

export function EditProductForm({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [title, setTitle] = useState(product.title);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState(product.status);
  const [featured, setFeatured] = useState(product.featured);

  const dirty =
    title !== product.title ||
    slug !== product.slug ||
    description !== product.description ||
    status !== product.status ||
    featured !== product.featured;

  const save = () => {
    setFieldErrors({});
    startTransition(async () => {
      const res = await updateProductAction(product.id, {
        title: title.trim(),
        slug: slug.trim(),
        description,
        status,
        featured,
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="accent-brand-500"
          />
          Trending — show in the storefront “Trending” section
        </label>

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
