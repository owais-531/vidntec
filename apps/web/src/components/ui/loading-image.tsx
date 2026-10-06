'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

/**
 * `next/image` with a loading state (pulsing placeholder + spinner until the
 * bitmap arrives) and a fallback tile if it fails (e.g. the asset was deleted).
 */
export function LoadingImage({
  wrapperClassName = '',
  className = '',
  onLoad,
  onError,
  alt = '',
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  return (
    <span className={`relative block ${wrapperClassName}`}>
      {state === 'loading' ? (
        <span
          role="status"
          aria-label="Loading image"
          className="absolute inset-0 flex animate-pulse items-center justify-center bg-paper-sunken"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-faint border-t-brand-500" />
        </span>
      ) : null}
      {state === 'failed' ? (
        <span className="flex h-full min-h-[inherit] w-full items-center justify-center bg-paper-sunken px-1 text-center text-[10px] text-ink-muted">
          Image unavailable
        </span>
      ) : (
        <Image
          {...props}
          alt={alt}
          className={`${className} transition-opacity duration-200 ${
            state === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={(e) => {
            setState('loaded');
            onLoad?.(e);
          }}
          onError={(e) => {
            setState('failed');
            onError?.(e);
          }}
        />
      )}
    </span>
  );
}
