'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ACCESS_TOKEN_COOKIE,
  CART_COOKIE,
  REFRESH_TOKEN_COOKIE,
  loginSchema,
  signupSchema,
  verifyOtpSchema,
  type PublicUser,
} from '@vidntec/shared';
import { parseSetCookies, type ParsedCookie } from '../set-cookie';
import { apiFetch } from '../api';
import { runAction, type ActionResult } from './result';

const API = process.env.API_URL;

export interface LoginState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export type SignupState = LoginState;
export type VerifyOtpState = LoginState;

/** `/verify-email?email=...&next=...` — where signup/an unverified login send the user. */
function verifyEmailPath(email: string, next: string): string {
  const params = new URLSearchParams({ email });
  if (next) params.set('next', next);
  return `/verify-email?${params.toString()}`;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** Fold any guest cart into the now-authenticated user's cart, relaying the new cart cookie. */
async function foldGuestCart(store: CookieStore, authCookies: ParsedCookie[]): Promise<void> {
  const at = authCookies.find((c) => c.name === ACCESS_TOKEN_COOKIE)?.value;
  if (!at) return;

  const cartId = store.get(CART_COOKIE)?.value;
  const merge = await fetch(`${API}/cart/merge`, {
    method: 'POST',
    headers: {
      cookie: [`${ACCESS_TOKEN_COOKIE}=${at}`, cartId ? `${CART_COOKIE}=${cartId}` : '']
        .filter(Boolean)
        .join('; '),
    },
    cache: 'no-store',
  }).catch(() => null);

  if (merge?.ok) {
    for (const c of parseSetCookies(merge.headers.getSetCookie(), new Set([CART_COOKIE]))) {
      store.set(c.name, c.value, c.options);
    }
  }
}

/** `next` is safe to redirect to only if it's a same-site path that isn't the admin area. */
function safeNext(next: string): string {
  return next && next.startsWith('/') && !next.startsWith('/admin') ? next : '/';
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const store = await cookies();

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 403) {
      redirect(verifyEmailPath(parsed.data.email, String(formData.get('next') ?? '')));
    }
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { error: body?.message ?? 'Sign in failed' };
  }

  const authCookies = parseSetCookies(res.headers.getSetCookie());
  for (const c of authCookies) store.set(c.name, c.value, c.options);
  const { user } = (await res.json()) as { user: PublicUser };

  await foldGuestCart(store, authCookies);

  const next = String(formData.get('next') ?? '');
  if (user.role === 'admin') {
    redirect(next.startsWith('/admin') ? next : '/admin/products');
  }
  redirect(safeNext(next));
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (formData.get('password') !== formData.get('confirmPassword')) {
    return { fieldErrors: { confirmPassword: ['Passwords do not match'] } };
  }

  const store = await cookies();

  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    const message =
      res.status === 409
        ? "An account with this email already exists. If you haven't verified it yet, you can resend the code below."
        : (body?.message ?? 'Could not create your account');
    return { error: message };
  }

  redirect(verifyEmailPath(parsed.data.email, String(formData.get('next') ?? '')));
}

export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = verifyOtpSchema.safeParse({
    email: formData.get('email'),
    code: formData.get('code'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const store = await cookies();

  const res = await fetch(`${API}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { error: body?.message ?? 'Invalid or expired code' };
  }

  const authCookies = parseSetCookies(res.headers.getSetCookie());
  for (const c of authCookies) store.set(c.name, c.value, c.options);

  await foldGuestCart(store, authCookies);

  redirect(safeNext(String(formData.get('next') ?? '')));
}

export async function resendOtpAction(email: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await apiFetch('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  });
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  await fetch(`${API}/auth/logout`, {
    method: 'POST',
    headers: refreshToken ? { cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` } : {},
    cache: 'no-store',
  }).catch(() => undefined);

  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  redirect('/login');
}
