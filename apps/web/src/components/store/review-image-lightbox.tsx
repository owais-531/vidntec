'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

/**
 * A row of review-image thumbnails; clicking one opens a fullscreen modal
 * slider over all of that review's images. Same overlay architecture as
 * `category-sidebar.tsx` (fixed backdrop, no page-content push).
 */
export function ReviewImageThumbnails({ urls }: { urls: string[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenAt(i)}
            className="h-16 w-16 overflow-hidden rounded-card border border-paper-line"
          >
            <Image
              src={url}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      {openAt != null ? (
        <ReviewImageLightbox urls={urls} startAt={openAt} onClose={() => setOpenAt(null)} />
      ) : null}
    </>
  );
}

function ReviewImageLightbox({
  urls,
  startAt,
  onClose,
}: {
  urls: string[];
  startAt: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startAt);
  const prev = () => setIndex((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIndex((i) => (i + 1) % urls.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.length]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
      </button>

      {urls.length > 1 ? (
        <button
          type="button"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : null}

      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={urls[index]!}
          alt=""
          width={1000}
          height={1000}
          className="max-h-[85vh] w-auto max-w-[90vw] rounded-card object-contain"
        />
        {urls.length > 1 ? (
          <p className="mt-2 text-center text-xs text-white/70">
            {index + 1} / {urls.length}
          </p>
        ) : null}
      </div>

      {urls.length > 1 ? (
        <button
          type="button"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
