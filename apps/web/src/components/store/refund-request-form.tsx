'use client';

import { useRef, useState, useTransition } from 'react';
import {
  REFUND_REQUEST_MAX_IMAGES,
  REFUND_REQUEST_MAX_IMAGE_BYTES,
  REFUND_REQUEST_REASONS,
  type RefundRequestInput,
} from '@vidntec/shared';
import {
  getRefundRequestUploadSignatureAction,
  submitRefundRequestAction,
} from '@/lib/actions/refund-requests';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

const REASON_LABELS: Record<(typeof REFUND_REQUEST_REASONS)[number], string> = {
  damaged: 'Damaged',
  defective: 'Defective',
  wrong_item: 'Wrong item received',
  other: 'Other',
};

type PendingPhoto = { url: string; publicId: string };

export function RefundRequestForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [reason, setReason] = useState<(typeof REFUND_REQUEST_REASONS)[number]>('damaged');
  const [details, setDetails] = useState('');
  const [phone, setPhone] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = REFUND_REQUEST_MAX_IMAGES - photos.length;
    if (room <= 0) {
      toast(`You can attach up to ${REFUND_REQUEST_MAX_IMAGES} photos`, 'error');
      return;
    }
    setUploading(true);
    try {
      const sig = await getRefundRequestUploadSignatureAction();
      if (!sig.ok) {
        toast(sig.error, 'error');
        return;
      }
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > REFUND_REQUEST_MAX_IMAGE_BYTES) {
          toast(`"${file.name}" is over ${REFUND_REQUEST_MAX_IMAGE_BYTES / (1024 * 1024)} MB`, 'error');
          continue;
        }
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sig.data.apiKey);
        form.append('timestamp', String(sig.data.timestamp));
        form.append('signature', sig.data.signature);
        form.append('folder', sig.data.folder);

        const up = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.data.cloudName}/image/upload`,
          { method: 'POST', body: form },
        );
        if (!up.ok) {
          toast('Upload failed', 'error');
          continue;
        }
        const json = (await up.json()) as { secure_url: string; public_id: string };
        setPhotos((prev) => [...prev, { url: json.secure_url, publicId: json.public_id }]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePhoto = (url: string) => setPhotos((prev) => prev.filter((p) => p.url !== url));

  const submit = () => {
    const input: RefundRequestInput = {
      name: name.trim(),
      email: email.trim(),
      orderReference: orderReference.trim(),
      reason,
      details: details.trim(),
      phone: phone.trim(),
      photos: photos.map(({ url, publicId }) => ({ url, publicId })),
    };
    startTransition(async () => {
      const res = await submitRefundRequestAction(input);
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast(res.error, 'error');
      }
    });
  };

  if (submitted) {
    return (
      <Card>
        <CardBody className="py-10 text-center">
          <div className="text-3xl">✅</div>
          <h2 className="mt-3 text-lg font-semibold">Request received</h2>
          <p className="mt-2 text-sm text-ink-soft">
            We&apos;ve got your refund request and will follow up by email or WhatsApp shortly.
          </p>
        </CardBody>
      </Card>
    );
  }

  const canSubmit =
    name.trim() && email.trim() && orderReference.trim() && details.trim() && phone.trim();

  return (
    <Card>
      <CardBody className="space-y-4">
        <Field label="Name" htmlFor="rr-name" required>
          <Input id="rr-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field
          label="Email"
          htmlFor="rr-email"
          required
          hint="The email you used at checkout — we use this to verify the order."
        >
          <Input
            id="rr-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>

        <Field
          label="Order number or tracking number"
          htmlFor="rr-order"
          required
          hint="Found on your confirmation page and email."
        >
          <Input
            id="rr-order"
            value={orderReference}
            onChange={(e) => setOrderReference(e.target.value)}
            placeholder="e.g. A1B2C3D4"
          />
        </Field>

        <Field label="Phone number" htmlFor="rr-phone" required hint="So we can follow up on WhatsApp.">
          <Input
            id="rr-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 03XX XXXXXXX"
          />
        </Field>

        <Field label="Reason" htmlFor="rr-reason" required>
          <Select
            id="rr-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REFUND_REQUEST_REASONS)[number])}
          >
            {REFUND_REQUEST_REASONS.map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Details" htmlFor="rr-details" required>
          <Textarea
            id="rr-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Tell us what happened"
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">
            Photos <span className="text-ink-muted">(optional, up to {REFUND_REQUEST_MAX_IMAGES})</span>
          </label>
          {photos.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.url} className="relative h-16 w-16 overflow-hidden rounded-card border border-paper-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.url)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {photos.length < REFUND_REQUEST_MAX_IMAGES ? (
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => onFiles(e.target.files)}
              className="text-xs text-ink-soft"
            />
          ) : null}
        </div>

        <Button className="w-full" onClick={submit} disabled={pending || uploading || !canSubmit}>
          {pending ? 'Submitting…' : 'Submit request'}
        </Button>
      </CardBody>
    </Card>
  );
}
