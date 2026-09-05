import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@vidntec/shared';
import { verifyAccessToken } from './lib/jwt';
import { parseAuthSetCookies } from './lib/set-cookie';

/**
 * The single token-refresh point for /admin. If the access token is missing or
 * expired it calls the API to rotate, then propagates the new cookies to BOTH:
 *   - the downstream request (so this render / server action sees a valid token
 *     and never triggers a second, conflicting refresh), and
 *   - the response (so the browser persists the rotated pair).
 *
 * The NestJS AdminGuard still re-checks role on every admin API call.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const toLogin = () => {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  };

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = await verifyAccessToken(accessToken);
  if (claims) {
    return claims.role === 'admin' ? NextResponse.next() : NextResponse.redirect(new URL('/', req.url));
  }

  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return toLogin();

  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error('API_URL is not set');

  const refreshed = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
    cache: 'no-store',
  });
  if (!refreshed.ok) return toLogin();

  const rotated = parseAuthSetCookies(refreshed.headers.getSetCookie());
  const newAccess = rotated.find((c) => c.name === ACCESS_TOKEN_COOKIE)?.value;
  const newRefresh = rotated.find((c) => c.name === REFRESH_TOKEN_COOKIE)?.value;

  const refreshedClaims = await verifyAccessToken(newAccess);
  if (!refreshedClaims) return toLogin();
  if (refreshedClaims.role !== 'admin') return NextResponse.redirect(new URL('/', req.url));

  // Forward the rotated cookies to the render / action that follows.
  const forwardedCookie = [
    ...req.cookies
      .getAll()
      .filter((c) => c.name !== ACCESS_TOKEN_COOKIE && c.name !== REFRESH_TOKEN_COOKIE)
      .map((c) => `${c.name}=${c.value}`),
    newAccess ? `${ACCESS_TOKEN_COOKIE}=${newAccess}` : '',
    newRefresh ? `${REFRESH_TOKEN_COOKIE}=${newRefresh}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('cookie', forwardedCookie);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  for (const cookie of refreshed.headers.getSetCookie()) {
    res.headers.append('set-cookie', cookie);
  }
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
