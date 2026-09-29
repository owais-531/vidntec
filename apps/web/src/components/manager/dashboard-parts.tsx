import Link from 'next/link';
import { formatMoney, type DashboardRanked } from '@vidntec/shared';
import { Card, CardBody } from '@/components/ui/card';

/** One headline figure. `delta` is a % change vs the previous period (null = n/a). */
export function StatTile({
  label,
  value,
  hint,
  delta,
  hero,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  hero?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className={`mt-1 font-semibold text-ink ${hero ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
        <p className="mt-1 min-h-[16px] text-xs text-ink-muted">
          {delta !== undefined && delta !== null ? (
            <span className={delta >= 0 ? 'font-medium text-accent-600' : 'font-medium text-brand-500'}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%{' '}
            </span>
          ) : null}
          {hint}
        </p>
      </CardBody>
    </Card>
  );
}

/** Percent change, rounded; null when there's nothing to compare against. */
export function pctChange(now: number, before: number | undefined): number | null {
  if (before === undefined || before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/** Horizontal bars (single hue, ≤24px, 4px rounded end) with the value at the tip. */
export function RankedBars({
  title,
  rows,
  metric = 'revenue',
  empty,
}: {
  title: string;
  rows: DashboardRanked[];
  metric?: 'revenue' | 'orders';
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r[metric]));
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-muted">{empty}</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li
                key={r.label}
                title={`${r.label}: ${formatMoney(r.revenue)} · ${r.orders} order${r.orders === 1 ? '' : 's'}${r.units ? ` · ${r.units} units` : ''}`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-ink">{r.label}</span>
                  <span className="shrink-0 font-medium text-ink">
                    {metric === 'revenue' ? formatMoney(r.revenue) : r.orders}
                  </span>
                </div>
                <div className="h-2 rounded-r-[4px] bg-brand-50">
                  <div
                    className="h-2 rounded-r-[4px] bg-brand-500"
                    style={{ width: `${Math.max(2, (r[metric] / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Two-part share bar with a legend (identity is never colour-alone). */
export function SplitBar({
  title,
  a,
  b,
}: {
  title: string;
  a: { label: string; value: number };
  b: { label: string; value: number };
}) {
  const total = a.value + b.value;
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
        {total === 0 ? (
          <p className="py-2 text-xs text-ink-muted">No orders in this range.</p>
        ) : (
          <>
            <div className="flex h-3 gap-[2px]" role="img" aria-label={`${a.label} ${pct(a.value)}%, ${b.label} ${pct(b.value)}%`}>
              {a.value > 0 ? (
                <div className="rounded-l-[4px] bg-brand-500" style={{ flex: a.value }} title={`${a.label}: ${a.value}`} />
              ) : null}
              {b.value > 0 ? (
                <div className="rounded-r-[4px] bg-brand-200" style={{ flex: b.value }} title={`${b.label}: ${b.value}`} />
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
                  {a.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">
                  {a.value} <span className="text-xs font-normal text-ink-muted">({pct(a.value)}%)</span>
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand-200" />
                  {b.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">
                  {b.value} <span className="text-xs font-normal text-ink-muted">({pct(b.value)}%)</span>
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardBody>
    </Card>
  );
}

export function ActionLink({ href, count, label }: { href: string; count: number; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-card border border-paper-line bg-white px-4 py-3 text-sm shadow-card hover:bg-paper-sunken"
    >
      <span className="text-ink-soft">{label}</span>
      <span className={`text-lg font-semibold ${count > 0 ? 'text-brand-500' : 'text-ink-faint'}`}>{count}</span>
    </Link>
  );
}
