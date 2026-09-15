'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { MediaType } from '@vidntec/shared';
import { cn } from '@/lib/cn';
import { posterUrl } from '@/lib/cloudinary-poster';

type Media = { url: string; position: number; type: MediaType; variantId: string | null };

export function ProductGallery({
  images,
  title,
  selectedVariantId,
}: {
  images: Media[];
  title: string;
  /** When set, the gallery jumps to the first image assigned to this variant. */
  selectedVariantId?: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!selectedVariantId) return;
    const idx = images.findIndex((img) => img.variantId === selectedVariantId);
    if (idx !== -1) setActive(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantId]);

  const current = images[active];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-card bg-white">
        {!current ? (
          <div className="flex h-full items-center justify-center text-4xl text-ink-faint">⚡</div>
        ) : current.type === 'video' ? (
          <video
            key={current.url}
            src={current.url}
            poster={posterUrl(current.url)}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain p-6"
          />
        ) : (
          <Image
            src={current.url}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
            priority
          />
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={img.type === 'video' ? 'Play product video' : `View image ${i + 1}`}
              className={cn(
                'relative h-16 w-16 overflow-hidden rounded border bg-white',
                i === active ? 'border-brand-500' : 'border-paper-line hover:border-ink-faint',
              )}
            >
              <Image
                src={img.type === 'video' ? posterUrl(img.url) : img.url}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1"
              />
              {img.type === 'video' ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-[10px] text-white">
                    ▶
                  </span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
