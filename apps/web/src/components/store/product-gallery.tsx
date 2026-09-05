'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/cn';

export function ProductGallery({
  images,
  title,
}: {
  images: { url: string; position: number }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-card bg-white">
        {current ? (
          <Image
            src={current.url}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-ink-faint">⚡</div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative h-16 w-16 overflow-hidden rounded border bg-white',
                i === active ? 'border-brand-500' : 'border-paper-line hover:border-ink-faint',
              )}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
