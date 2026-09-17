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
  const goPrev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActive((i) => (i + 1) % images.length);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-card bg-white">
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : null}
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
