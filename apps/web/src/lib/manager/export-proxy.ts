import 'server-only';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * Stream a CSV from the API to the browser. A plain <form method="get"> hits
 * the Next route handler (session cookies attach automatically), which forwards
 * the cookies server-side — the API's ManagerGuard is still the real gate.
 * Empty form fields are dropped so "no date" doesn't fail validation.
 */
export async function proxyCsv(req: NextRequest, apiPath: string, allowed: string[]): Promise<Response> {
  const params = new URLSearchParams();
  for (const key of allowed) {
    const v = req.nextUrl.searchParams.get(key);
    if (v) params.set(key, v);
  }

  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(`${process.env.API_URL}${apiPath}?${params}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: 'no-store',
  });

  if (!res.ok) {
    const msg = res.status === 400 ? 'Invalid export filters.' : 'Export failed or not permitted.';
    return new Response(msg, { status: res.status, headers: { 'content-type': 'text/plain' } });
  }

  const headers = new Headers({
    'content-type': 'text/csv; charset=utf-8',
    'cache-control': 'no-store',
  });
  const disposition = res.headers.get('content-disposition');
  if (disposition) headers.set('content-disposition', disposition);
  return new Response(res.body, { status: 200, headers });
}
