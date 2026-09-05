import { ACCESS_TOKEN_COOKIE, CART_COOKIE, REFRESH_TOKEN_COOKIE } from '@vidntec/shared';

export interface ParsedCookie {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    path: string;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge?: number;
  };
}

/** Cookies the web is willing to relay from the API's responses to the browser. */
const RELAYABLE = new Set<string>([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, CART_COOKIE]);

/** Parse `Set-Cookie` headers, keeping only cookies in `only` (default: all relayable). */
export function parseSetCookies(
  setCookieHeaders: string[],
  only: Set<string> = RELAYABLE,
): ParsedCookie[] {
  const out: ParsedCookie[] = [];
  for (const raw of setCookieHeaders) {
    const parts = raw.split(';').map((s) => s.trim());
    const pair = parts[0];
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq);
    if (!only.has(name)) continue;

    const attrs = parts.slice(1);
    const lower = attrs.map((a) => a.toLowerCase());
    const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith('max-age='));
    out.push({
      name,
      value: pair.slice(eq + 1),
      options: {
        httpOnly: lower.includes('httponly'),
        secure: lower.includes('secure'),
        path: attrs.find((a) => a.toLowerCase().startsWith('path='))?.slice(5) ?? '/',
        sameSite:
          (attrs
            .find((a) => a.toLowerCase().startsWith('samesite='))
            ?.slice(9)
            .toLowerCase() as 'lax' | 'strict' | 'none') ?? 'lax',
        ...(maxAgeAttr ? { maxAge: Number(maxAgeAttr.slice(8)) } : {}),
      },
    });
  }
  return out;
}

/** Back-compat helper: only the auth cookies. */
export function parseAuthSetCookies(setCookieHeaders: string[]): ParsedCookie[] {
  return parseSetCookies(
    setCookieHeaders,
    new Set([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]),
  );
}
