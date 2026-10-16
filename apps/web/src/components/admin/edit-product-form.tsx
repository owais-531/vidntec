'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  PREVIEW_MAX_LIMIT,
  PRODUCT_STATUSES,
  type AdminCategory,
  type AdminProduct,
  type ProductSpec,
} from '@vidntec/shared';
import { deleteProductAction, updateProductAction } from '@/lib/actions/catalog';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { PersonalizationFieldsEditor } from '@/components/admin/personalization-fields-editor';
import { fieldsSignature, fromDrafts, toDrafts, type FieldDraft } from '@/lib/personalization-draft';
import { PreviewFields } from '@/components/admin/preview-fields';
import { SpecFields } from '@/components/admin/spec-fields';
import { ScopeField } from '@/components/admin/scope-field';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

function sameSpecs(a: ProductSpec[], b: ProductSpec[]): boolean {
  return (
    a.length === b.length && a.every((s, i) => s.label === b[i]!.label && s.value === b[i]!.value)
  );
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
  const [scope, setScope] = useState(product.scope);
  const [status, setStatus] = useState(product.status);
  const [featured, setFeatured] = useState(product.featured);
  const [categoryId, setCategoryId] = useState(product.categoryId ?? '');
  const [fieldDrafts, setFieldDrafts] = useState<FieldDraft[]>(() =>
    toDrafts(product.personalizationFields),
  );
  const [previewEnabled, setPreviewEnabled] = useState(product.previewEnabled);
  const [nameFieldId, setNameFieldId] = useState(product.previewNameFieldId ?? '');
  const [initialFieldId, setInitialFieldId] = useState(product.previewInitialFieldId ?? '');
  const [colourFieldId, setColourFieldId] = useState(product.previewColourFieldId ?? '');
  const [previewPrompt, setPreviewPrompt] = useState(product.previewPrompt);
  const [previewLimit, setPreviewLimit] = useState(String(product.previewLimit));
  const [specs, setSpecs] = useState<ProductSpec[]>(product.specs);

  const asOption = (d: FieldDraft) => ({ id: d.id, label: d.label });
  const textFields = fieldDrafts.filter((d) => d.type === 'text').map(asOption);
  const dropdownFields = fieldDrafts.filter((d) => d.type === 'dropdown').map(asOption);
  // A mapping whose field was just removed/retyped in the form above counts as unset.
  const effName = textFields.some((f) => f.id === nameFieldId) ? nameFieldId : '';
  const effInitial =
    effName !== initialFieldId && textFields.some((f) => f.id === initialFieldId) ? initialFieldId : '';
  const effColour = dropdownFields.some((f) => f.id === colourFieldId) ? colourFieldId : '';

  const dirty =
    title !== product.title ||
    slug !== product.slug ||
    description !== product.description ||
    scope !== product.scope ||
    status !== product.status ||
    featured !== product.featured ||
    categoryId !== (product.categoryId ?? '') ||
    fieldsSignature(fieldDrafts) !== fieldsSignature(toDrafts(product.personalizationFields)) ||
    previewEnabled !== product.previewEnabled ||
    effName !== (product.previewNameFieldId ?? '') ||
    effInitial !== (product.previewInitialFieldId ?? '') ||
    effColour !== (product.previewColourFieldId ?? '') ||
    previewPrompt !== product.previewPrompt ||
    previewLimit !== String(product.previewLimit) ||
    !sameSpecs(specs, product.specs);

  const save = () => {
    setFieldErrors({});
    const parsedFields = fromDrafts(fieldDrafts);
    if (!parsedFields.ok) {
      setFieldErrors({ personalizationFields: [parsedFields.error] });
      return;
    }
    const limitNum = Number(previewLimit);
    if (previewEnabled && !(Number.isInteger(limitNum) && limitNum >= 1 && limitNum <= PREVIEW_MAX_LIMIT)) {
      setFieldErrors({ previewLimit: [`Enter a number from 1 to ${PREVIEW_MAX_LIMIT}`] });
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
        scope,
        status,
        featured,
        categoryId: categoryId || null,
        personalizationFields: parsedFields.fields,
        previewEnabled,
        previewNameFieldId: effName || null,
        previewInitialFieldId: effInitial || null,
        previewColourFieldId: effColour || null,
        previewPrompt: previewPrompt.trim(),
        ...(Number.isInteger(limitNum) && limitNum >= 1 && limitNum <= PREVIEW_MAX_LIMIT
          ? { previewLimit: limitNum }
          : {}),
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
        <ScopeField
          value={scope}
          onChange={setScope}
          getDraftContext={() => ({
            title,
            description,
            categoryName: categories.find((c) => c.id === categoryId)?.name,
            specs: specs.filter((s) => s.label.trim() && s.value.trim()),
            variantNames: product.variants.map((v) => v.name),
          })}
          error={fieldErrors.scope?.[0]}
        />
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
          <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
          <PersonalizationFieldsEditor
            drafts={fieldDrafts}
            onChange={setFieldDrafts}
            error={fieldErrors.personalizationFields?.[0]}
          />
        </div>

        <div className="border-t border-paper-line pt-4">
          <PreviewFields
            enabled={previewEnabled}
            onEnabledChange={(on) => {
              setPreviewEnabled(on);
              // Turning it on with one obvious candidate: pick the first text field as the name.
              if (on && !effName && textFields[0]) setNameFieldId(textFields[0].id);
            }}
            prompt={previewPrompt}
            onPromptChange={setPreviewPrompt}
            limit={previewLimit}
            onLimitChange={setPreviewLimit}
            textFields={textFields}
            dropdownFields={dropdownFields}
            nameFieldId={effName}
            onNameFieldChange={setNameFieldId}
            initialFieldId={effInitial}
            onInitialFieldChange={setInitialFieldId}
            colourFieldId={effColour}
            onColourFieldChange={setColourFieldId}
            referenceCount={product.previewReferences.length}
            errors={{
              enabled: fieldErrors.previewEnabled?.[0],
              prompt: fieldErrors.previewPrompt?.[0],
              limit: fieldErrors.previewLimit?.[0],
            }}
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
