'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import {
  parsePreviewLetters,
  PREVIEW_MAX_REFERENCES,
  type AdminPreviewReference,
  type AdminVariant,
} from '@vidntec/shared';
import {
  attachPreviewReferenceAction,
  deletePreviewReferenceAction,
  getUploadSignatureAction,
  setPreviewReferenceLettersAction,
  testPreviewAction,
} from '@/lib/actions/catalog';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input, Select } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

function ReferenceTile({ productId, reference }: { productId: string; reference: AdminPreviewReference }) {
  const [letters, setLetters] = useState(reference.letters.join(', '));
  const [pending, start] = useTransition();
  const saved = reference.letters.join(', ');

  const save = () => {
    const parsed = parsePreviewLetters(letters);
    const normalised = parsed.join(', ');
    setLetters(normalised);
    if (normalised === saved) return;
    start(async () => {
      const res = await setPreviewReferenceLettersAction(productId, reference.id, parsed);
      if (!res.ok) toast(res.error, 'error');
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="relative overflow-hidden rounded-card border border-paper-line bg-paper-sunken">
        <Image
          src={reference.url}
          alt=""
          width={240}
          height={240}
          className="aspect-square w-full object-contain"
        />
        {reference.letters.length === 0 ? (
          <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            Default
          </span>
        ) : null}
      </div>
      <Input
        value={letters}
        disabled={pending}
        onChange={(e) => setLetters(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="Letters, e.g. A or V, W"
        aria-label="Initials this photo is used for (blank = default)"
        className="!px-2 !py-1 text-xs"
      />
      <ConfirmButton
        message="Delete photo?"
        confirmLabel="Delete"
        successMessage="Reference photo deleted"
        action={() => deletePreviewReferenceAction(productId, reference.id)}
      >
        Delete
      </ConfirmButton>
    </div>
  );
}

function TestPreview({ productId, variants }: { productId: string; variants: AdminVariant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () => {
    setError(null);
    start(async () => {
      const res = await testPreviewAction(productId, { variantId, name: name.trim() });
      if (res.ok) {
        setImage(res.data.imageDataUrl);
      } else {
        setImage(null);
        setError(res.fieldErrors?.name?.[0] ?? res.error);
      }
    });
  };

  return (
    <div className="space-y-3 border-t border-paper-line pt-4">
      <div>
        <h3 className="text-sm font-semibold">Test it</h3>
        <p className="text-xs text-ink-muted">
          Runs the real preview with the saved settings and photos, using the chosen variant’s colour.
          It uses the paid image API (about 20 seconds) but does not count against customers’ limits.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {variants.length > 1 ? (
          <Select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="!w-auto"
            aria-label="Variant to preview"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, e.g. Ayesha"
          maxLength={40}
          className="!w-56"
          aria-label="Name to preview"
        />
        <Button size="sm" onClick={run} disabled={pending || !name.trim() || !variantId}>
          {pending ? 'Generating…' : 'Generate test preview'}
        </Button>
      </div>
      {pending ? <p className="text-xs text-ink-muted">Creating the image — this takes about 20 seconds…</p> : null}
      {error ? <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">{error}</p> : null}
      {image ? (
        <Image
          src={image}
          alt={`Preview for ${name}`}
          width={400}
          height={600}
          unoptimized
          className="h-auto w-full max-w-xs rounded-card border border-paper-line"
        />
      ) : null}
    </div>
  );
}

export function PreviewReferenceManager({
  productId,
  references,
  variants,
}: {
  productId: string;
  references: AdminPreviewReference[];
  variants: AdminVariant[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const ordered = [...references].sort((a, b) => a.position - b.position);
  const hasDefault = ordered.some((r) => r.letters.length === 0);
  const covered = [...new Set(ordered.flatMap((r) => r.letters))].sort();

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const sig = await getUploadSignatureAction();
      if (!sig.ok) {
        toast(sig.error, 'error');
        return;
      }
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sig.data.apiKey);
        form.append('timestamp', String(sig.data.timestamp));
        form.append('signature', sig.data.signature);
        form.append('folder', sig.data.folder);
        const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.data.cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        });
        if (!up.ok) {
          toast('Upload to Cloudinary failed', 'error');
          continue;
        }
        const json = (await up.json()) as { secure_url: string; public_id: string };
        const attached = await attachPreviewReferenceAction(productId, {
          url: json.secure_url,
          publicId: json.public_id,
          letters: [],
        });
        if (!attached.ok) toast(attached.error, 'error');
      }
      toast('Photo uploaded');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">AI preview — reference photos</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Real photos of the product that the AI redraws with the customer’s name. Upload one{' '}
              <strong>Default</strong> photo (leave its letters blank) for most initials, then add photos for
              any initial the default gets wrong — type that letter under the photo (e.g. <em>A</em>). Clean
              photos work best; the AI replaces the background with white.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0 whitespace-nowrap"
            disabled={uploading || ordered.length >= PREVIEW_MAX_REFERENCES}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : '+ Upload photo'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>

        {ordered.length === 0 ? (
          <p className="text-xs text-ink-muted">No reference photos yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              {ordered.map((r) => (
                <ReferenceTile key={r.id} productId={productId} reference={r} />
              ))}
            </div>
            <p className="text-xs text-ink-muted">
              {hasDefault ? (
                <span className="text-accent-600">Default photo set.</span>
              ) : (
                <span className="text-brand-700">
                  No default photo — initials without their own photo will use the first one above.
                </span>
              )}{' '}
              {covered.length ? `Own photo for: ${covered.join(', ')}.` : null}
            </p>
          </>
        )}

        {ordered.length > 0 ? <TestPreview productId={productId} variants={variants} /> : null}
      </CardBody>
    </Card>
  );
}
