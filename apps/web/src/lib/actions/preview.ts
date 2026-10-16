'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import {
  PREVIEW_VISITOR_COOKIE,
  PREVIEW_VISITOR_COOKIE_TTL_SECONDS,
  type PreviewResponse,
} from '@vidntec/shared';
import { apiFetch } from '../api';
import { runAction, type ActionResult } from './result';

/** The browser's opaque id for the per-visitor preview limit — created on first use. */
async function visitorKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(PREVIEW_VISITOR_COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;
  const key = randomBytes(16).toString('hex');
  store.set(PREVIEW_VISITOR_COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PREVIEW_VISITOR_COOKIE_TTL_SECONDS,
  });
  return key;
}

/** AI preview of a customer's name on a product. Nothing is stored — the image is shown once. */
export async function generatePreviewAction(
  slug: string,
  variantId: string,
  name: string,
  extras: { initial?: string; colourChoice?: string } = {},
): Promise<ActionResult<PreviewResponse>> {
  const key = await visitorKey();
  return runAction(() =>
    apiFetch<PreviewResponse>(`/products/${encodeURIComponent(slug)}/preview`, {
      method: 'POST',
      body: JSON.stringify({ variantId, name, ...extras, visitorKey: key }),
      forwardCookies: false,
    }),
  );
}
