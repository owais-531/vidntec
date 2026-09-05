import { cookies } from 'next/headers';
import { apiErrorSchema, type ApiError } from '@vidntec/shared';

const BASE_URL =
  typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(Array.isArray(body.message) ? body.message.join(', ') : body.message);
    this.name = 'ApiRequestError';
  }
}

type ApiFetchOptions = RequestInit & {
  /** On the server, forward the incoming request's cookies to the API. Default true. */
  forwardCookies?: boolean;
};

/**
 * Call the NestJS API and also hand back its `Set-Cookie` headers so a Server
 * Action can relay them (used for the guest-cart cookie).
 *
 * Token refresh is NOT done here — the Next middleware is the single refresh
 * point for /admin. Racing it would trip refresh-token reuse detection.
 */
export async function apiCall<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ data: T; setCookies: string[] }> {
  const isServer = typeof window === 'undefined';
  const { forwardCookies = true, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('content-type') && rest.body) {
    finalHeaders.set('content-type', 'application/json');
  }
  if (isServer && forwardCookies) {
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    if (cookieHeader) finalHeaders.set('cookie', cookieHeader);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
    // Default to no-store, but respect an explicit `cache` or a `next` (revalidate/tags)
    // option so storefront reads can use Next's Data Cache.
    ...(rest.cache || rest.next ? {} : { cache: 'no-store' }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    throw new ApiRequestError(
      res.status,
      parsed.success
        ? parsed.data
        : { statusCode: res.status, error: 'Error', message: res.statusText },
    );
  }

  return { data: data as T, setCookies: res.headers.getSetCookie() };
}

/** Convenience wrapper when the response cookies aren't needed. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { data } = await apiCall<T>(path, options);
  return data;
}
