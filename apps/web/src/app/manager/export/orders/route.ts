import type { NextRequest } from 'next/server';
import { proxyCsv } from '@/lib/manager/export-proxy';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  return proxyCsv(req, '/manager/exports/orders', ['from', 'to', 'status', 'mode']);
}
