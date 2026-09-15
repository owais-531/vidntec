'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import type { AdminVariant, ProductImageDto } from '@vidntec/shared';
import {
  attachImageAction,
  deleteImageAction,
  getUploadSignatureAction,
  reorderImagesAction,
  setImageVariantAction,
} from '@/lib/actions/catalog';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { posterUrl } from '@/lib/cloudinary-poster';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // Cloudinary free-plan per-file video cap

export function ImageManager({
  productId,
  images,
  variants = [],
}: {
  productId: string;
  images: ProductImageDto[];
  variants?: AdminVariant[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const ordered = [...images].sort((a, b) => a.position - b.position);
  // Not worth assigning a variant when there's only one — every image would
  // just point at the same one.
  const showVariantAssignment = variants.length > 1;

  const assignVariant = (imageId: string, variantId: string) => {
    start(async () => {
      const res = await setImageVariantAction(productId, imageId, variantId || null);
      if (!res.ok) toast(res.error, 'error');
    });
  };

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
        const isVideo = file.type.startsWith('video/');
        if (isVideo && file.size > MAX_VIDEO_BYTES) {
          toast(`"${file.name}" is over 100 MB — please upload a shorter clip`, 'error');
          continue;
        }

        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sig.data.apiKey);
        form.append('timestamp', String(sig.data.timestamp));
        form.append('signature', sig.data.signature);
        form.append('folder', sig.data.folder);

        const up = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.data.cloudName}/${isVideo ? 'video' : 'image'}/upload`,
          { method: 'POST', body: form },
        );
        if (!up.ok) {
          toast('Upload to Cloudinary failed', 'error');
          continue;
        }
        const json = (await up.json()) as {
          secure_url: string;
          public_id: string;
          resource_type?: string;
        };
        const attached = await attachImageAction(productId, {
          url: json.secure_url,
          publicId: json.public_id,
          type: json.resource_type === 'video' || isVideo ? 'video' : 'image',
        });
        if (!attached.ok) toast(attached.error, 'error');
      }
      toast('Media uploaded');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    start(async () => {
      const res = await reorderImagesAction(
        productId,
        next.map((i) => i.id),
      );
      if (!res.ok) toast(res.error, 'error');
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Media</h2>
          <Button
            size="sm"
            variant="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : '+ Upload media'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>

        {ordered.length === 0 ? (
          <p className="text-xs text-ink-muted">
            No media yet. Add images and short product videos — the first image is used as
            the product thumbnail.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {ordered.map((img, i) => (
              <div key={img.id} className="space-y-1">
                <div className="group relative overflow-hidden rounded-card border border-paper-line bg-paper-sunken">
                  <Image
                    src={img.type === 'video' ? posterUrl(img.url) : img.url}
                    alt=""
                    width={200}
                    height={200}
                    className="aspect-square w-full object-cover"
                  />
                  {img.type === 'video' ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-xs text-white">
                        ▶
                      </span>
                    </span>
                  ) : null}
                  {i === 0 && img.type !== 'video' ? (
                    <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Primary
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={pending || i === 0}
                        onClick={() => move(i, -1)}
                        className="text-white disabled:opacity-30"
                        aria-label="Move left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={pending || i === ordered.length - 1}
                        onClick={() => move(i, 1)}
                        className="text-white disabled:opacity-30"
                        aria-label="Move right"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          const res = await deleteImageAction(productId, img.id);
                          if (!res.ok) toast(res.error, 'error');
                        })
                      }
                      className="text-white"
                      aria-label="Delete image"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {showVariantAssignment ? (
                  <select
                    value={img.variantId ?? ''}
                    disabled={pending}
                    onChange={(e) => assignVariant(img.id, e.target.value)}
                    className="w-full rounded border border-paper-line bg-white px-1 py-1 text-[11px] text-ink-soft disabled:opacity-50"
                    aria-label="Assign to variant"
                  >
                    <option value="">All variants</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
