'use client';

import { useState } from 'react';
import { formatMoney, type DashboardBucket } from '@vidntec/shared';

const H = 180;
const PAD = { top: 12, right: 8, bottom: 22, left: 44 };
const MAX_BAR = 24;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function label(date: string, granularity: 'day' | 'month'): string {
  const [y, m, d] = date.split('-');
  const mon = MONTHS[Number(m) - 1] ?? '';
  return granularity === 'day' ? `${Number(d)} ${mon}` : `${mon} ${y}`;
}

/** 1,200,000 → "12K" (minor units → rupees, compact). */
function compact(minor: number): string {
  const v = minor / 100;
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

/** A "nice" axis ceiling (1, 2, 2.5, 5, 10 × 10^n) so ticks land on clean numbers. */
function niceMax(minor: number): number {
  if (minor <= 0) return 100_00;
  const mag = 10 ** Math.floor(Math.log10(minor));
  const n = minor / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

export function RevenueChart({
  series,
  granularity,
}: {
  series: DashboardBucket[];
  granularity: 'day' | 'month';
}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 720;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...series.map((b) => b.revenue)));
  const slot = series.length ? innerW / series.length : innerW;
  const barW = Math.min(MAX_BAR, Math.max(2, slot - 2)); // 2px surface gap between bars
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const current = active !== null ? series[active] : null;
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));

  return (
    <div>
      <p className="mb-2 min-h-[20px] text-xs text-ink-muted" aria-live="polite">
        {current ? (
          <>
            <span className="text-sm font-semibold text-ink">{formatMoney(current.revenue)}</span>{' '}
            · {label(current.date, granularity)} · {current.orders} order{current.orders === 1 ? '' : 's'}
          </>
        ) : (
          'Hover or focus a bar for details'
        )}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Revenue by ${granularity}`}
        className="w-full"
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#ececec" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#8a8a8a">
                {compact(t)}
              </text>
            </g>
          );
        })}

        {series.map((b, i) => {
          const h = (b.revenue / max) * innerH;
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = PAD.top + innerH - h;
          const r = Math.min(4, barW / 2, h);
          const isActive = active === i;
          return (
            <g key={b.date}>
              {/* Hit target: the full slot, taller than the mark. */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${label(b.date, granularity)}: ${formatMoney(b.revenue)}, ${b.orders} orders`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
              {b.revenue > 0 ? (
                // Square at the baseline, 4px-rounded data end.
                <path
                  d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`}
                  fill={isActive ? '#671112' : '#8a1a1c'}
                  pointerEvents="none"
                />
              ) : null}
              {i % labelEvery === 0 ? (
                <text
                  x={PAD.left + i * slot + slot / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#8a8a8a"
                >
                  {label(b.date, granularity)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <details className="mt-2 text-xs text-ink-muted">
        <summary className="cursor-pointer select-none">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-card border border-paper-line">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-paper-line">
                <th className="px-3 py-1.5 font-medium">{granularity === 'day' ? 'Day' : 'Month'}</th>
                <th className="px-3 py-1.5 font-medium">Orders</th>
                <th className="px-3 py-1.5 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {series.map((b) => (
                <tr key={b.date} className="border-b border-paper-line last:border-0">
                  <td className="px-3 py-1.5">{label(b.date, granularity)}</td>
                  <td className="px-3 py-1.5">{b.orders}</td>
                  <td className="px-3 py-1.5">{formatMoney(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
