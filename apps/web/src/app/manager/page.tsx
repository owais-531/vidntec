import type { Metadata } from 'next';
import Link from 'next/link';
import {
  DASHBOARD_RANGES,
  ORDER_STATUSES,
  formatMoney,
  formatOrderDateTime,
  type DashboardRange,
} from '@vidntec/shared';
import { getDashboard } from '@/lib/manager/queries';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/order-status-badge';
import { StarRating } from '@/components/store/star-rating';
import { RevenueChart } from '@/components/manager/revenue-chart';
import { ActionLink, RankedBars, SplitBar, StatTile, pctChange } from '@/components/manager/dashboard-parts';

export const metadata: Metadata = { title: 'Dashboard' };

const RANGE_LABEL: Record<DashboardRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  all: 'All time',
};

const isRange = (v: string | undefined): v is DashboardRange =>
  DASHBOARD_RANGES.includes(v as DashboardRange);

export default async function ManagerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: DashboardRange = isRange(sp.range) ? sp.range : '30d';
  const d = await getDashboard(range);
  const t = d.totals;
  const vsLabel = d.previous ? `vs previous ${RANGE_LABEL[range].toLowerCase().replace('last ', '')}` : undefined;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Revenue counts every order except cancelled and refunded ones."
        action={
          <Link href="/manager/exports" className="text-xs text-ink-muted hover:text-ink">
            Export CSV →
          </Link>
        }
      />

      {/* Filters: one row above the content they scope. */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {DASHBOARD_RANGES.map((r) => (
          <Link
            key={r}
            href={r === '30d' ? '/manager' : `/manager?range=${r}`}
            className={`rounded-card px-3 py-1.5 ${range === r ? 'bg-brand-50 text-brand-600' : 'bg-white text-ink-soft'}`}
          >
            {RANGE_LABEL[r]}
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <StatTile
            hero
            label={`Total revenue · ${RANGE_LABEL[range]}`}
            value={formatMoney(t.revenue)}
            delta={d.previous ? pctChange(t.revenue, d.previous.revenue) : null}
            hint={vsLabel}
          />
        </div>
        <StatTile
          label="Orders"
          value={String(t.orders)}
          delta={d.previous ? pctChange(t.orders, d.previous.orders) : null}
          hint={vsLabel}
        />
        <StatTile label="Average order value" value={formatMoney(t.averageOrderValue)} />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <ActionLink href="/manager/orders?status=pending" count={d.needsAttention.pending} label="Pending — need confirming" />
        <ActionLink href="/manager/orders?status=confirmed" count={d.needsAttention.toFulfil} label="Confirmed — need shipping" />
        <StatTile
          label="Delivered revenue"
          value={formatMoney(t.deliveredRevenue)}
          hint={`${formatMoney(t.lostValue)} lost to ${t.lostOrders} cancelled/refunded`}
        />
      </div>

      <Card className="mb-5">
        <CardBody>
          <h2 className="mb-1 text-sm font-semibold text-ink">
            Revenue by {d.granularity === 'day' ? 'day' : 'month'}
          </h2>
          <RevenueChart series={d.series} granularity={d.granularity} />
        </CardBody>
      </Card>

      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <RankedBars title="Top products by revenue" rows={d.topProducts} empty="No sales in this range." />
        <RankedBars title="Top cities by revenue" rows={d.topCities} empty="No orders in this range." />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <RankedBars title="Revenue by province" rows={d.provinces} empty="No province data yet." />
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold text-ink">Orders by status</h2>
            <ul className="divide-y divide-paper-line text-sm">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link
                    href={`/manager/orders?status=${s}`}
                    className="flex items-center justify-between py-2 hover:bg-paper-sunken"
                  >
                    <OrderStatusBadge status={s} />
                    <span className="font-medium text-ink">{d.statusCounts[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <SplitBar
          title="Customers"
          a={{ label: 'New', value: d.customers.new }}
          b={{ label: 'Returning', value: d.customers.returning }}
        />
        <SplitBar
          title="Delivery"
          a={{ label: 'Free delivery', value: t.freeDeliveryOrders }}
          b={{ label: 'Paid delivery', value: t.paidDeliveryOrders }}
        />
        <SplitBar
          title="Account"
          a={{ label: 'Guest', value: t.guestOrders }}
          b={{ label: 'Registered', value: t.registeredOrders }}
        />
      </div>

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Reviews</h2>
            <Link href="/manager/reviews" className="text-xs text-ink-muted hover:text-ink">
              Manage reviews →
            </Link>
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            <span className="text-2xl font-semibold text-ink">
              {d.reviews.averageRating !== null ? d.reviews.averageRating.toFixed(1) : '—'}
            </span>{' '}
            average · {d.reviews.total} review{d.reviews.total === 1 ? '' : 's'} (all time)
          </p>
          {d.reviews.latest.length === 0 ? (
            <p className="text-xs text-ink-muted">No reviews yet.</p>
          ) : (
            <ul className="divide-y divide-paper-line">
              {d.reviews.latest.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{r.authorName}</span>
                      {r.rating != null ? <StarRating value={r.rating} size="xs" /> : null}
                    </div>
                    <p className="truncate text-xs text-ink-soft">{r.comment ?? '—'}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-muted">{formatOrderDateTime(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
