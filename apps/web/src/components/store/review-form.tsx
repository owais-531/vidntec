'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REVIEW_MAX_IMAGES, REVIEW_MAX_IMAGE_BYTES, type MyReview } from '@vidntec/shared';
import {
  deleteMyReviewAction,
  getReviewUploadSignatureAction,
  submitReviewAction,
} from '@/lib/actions/reviews';
import { StarRating } from './star-rating';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

type PendingImage = { url: string; publicId: string };

export function ReviewForm({
  productId,
  productSlug,
  existing,
}: {
  productId: string;
  productSlug: string;
  existing: MyReview | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [authorName, setAuthorName] = useState(existing?.authorName ?? '');
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [images, setImages] = useState<PendingImage[]>(
    existing?.images.map((i) => ({ url: i.url, publicId: i.publicId ?? '' })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = REVIEW_MAX_IMAGES - images.length;
    if (room <= 0) {
      toast(`You can attach up to ${REVIEW_MAX_IMAGES} photos`, 'error');
      return;
    }
    setUploading(true);
    try {
      const sig = await getReviewUploadSignatureAction();
      if (!sig.ok) {
        toast(sig.error, 'error');
        return;
      }
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > REVIEW_MAX_IMAGE_BYTES) {
          toast(`"${file.name}" is over ${REVIEW_MAX_IMAGE_BYTES / (1024 * 1024)} MB`, 'error');
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
        setImages((prev) => [...prev, { url: json.secure_url, publicId: json.public_id }]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((i) => i.url !== url));

  const submit = () => {
    if (rating == null && !comment.trim()) {
      toast('Give a star rating and/or write a comment', 'error');
      return;
    }
    startTransition(async () => {
      const res = await submitReviewAction(productId, productSlug, {
        authorName,
        rating,
        comment: comment.trim() || null,
        images: images.map(({ url, publicId }) => ({
          url,
          ...(publicId ? { publicId } : {}),
        })),
      });
      if (res.ok) {
        toast(existing ? 'Review updated' : 'Review posted');
        router.refresh();
      } else {
        toast(res.error, 'error');
      }
    });
  };

  return (
    <div className="rounded-card border border-paper-line bg-paper-sunken p-4">
      <h3 className="text-sm font-semibold">{existing ? 'Edit your review' : 'Write a review'}</h3>
      <div className="mt-3 space-y-4">
        <Field label="Rating">
          <StarRating value={rating} interactive onChange={setRating} />
        </Field>
        <Field label="Your name" required>
          <Input
            value={authorName}
            maxLength={60}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. Ayesha"
          />
        </Field>
        <Field label="Comment" hint="Optional if you've given a star rating.">
          <Textarea
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think?"
          />
        </Field>
        <Field label="Photos" hint={`Up to ${REVIEW_MAX_IMAGES} photos.`}>
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.url} className="relative h-16 w-16 overflow-hidden rounded-card border border-paper-line">
                <Image src={img.url} alt="" width={64} height={64} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img.url)}
                  aria-label="Remove photo"
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {images.length < REVIEW_MAX_IMAGES ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="flex h-16 w-16 items-center justify-center rounded-card border border-dashed border-paper-line text-xs text-ink-muted hover:text-ink disabled:opacity-50"
              >
                {uploading ? '…' : '+ Add'}
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void onFiles(e.target.files)}
            />
          </div>
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={pending || uploading || !authorName.trim()}>
            {pending ? 'Saving…' : existing ? 'Update review' : 'Post review'}
          </Button>
          {existing ? (
            <ConfirmButton
              message="Delete your review?"
              confirmLabel="Delete"
              successMessage="Review deleted"
              action={async () => {
                const res = await deleteMyReviewAction(productId, productSlug);
                if (res.ok) router.refresh();
                return res;
              }}
            >
              Delete review
            </ConfirmButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
