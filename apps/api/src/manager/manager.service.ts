import { Injectable } from '@nestjs/common';
import { Prisma } from '@vidntec/shared/prisma';
import {
  NON_REVENUE_STATUSES,
  ORDER_STATUSES,
  orderNumber,
  type CustomersExportQuery,
  type DashboardBucket,
  type DashboardData,
  type DashboardQuery,
  type DashboardRange,
  type DashboardRanked,
  type OrdersExportQuery,
} from '@vidntec/shared';
import { PrismaService } from '../prisma/prisma.service';
import { money, toCsv, type CsvCell } from './csv';
import { addDays, formatStoreDateTime, parseStoreDay, startOfStoreDay, STORE_TZ } from './dates';

const RANGE_DAYS: Record<Exclude<DashboardRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

/** SQL fragment: order-local (store timezone) timestamp of `orders."createdAt"`. */
const LOCAL_TS = Prisma.sql`(o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${STORE_TZ}`;
const REVENUE_SQL = Prisma.sql`o.status NOT IN ('cancelled', 'refunded')`;

type Addr = { name?: string; city?: string; state?: string; phone?: string; line1?: string; line2?: string; postalCode?: string; country?: string };
const addr = (json: unknown): Addr => (json && typeof json === 'object' ? (json as Addr) : {});
const num = (v: unknown): number => Number(v ?? 0);

/** Time between two moments in `unit` ms, 1 decimal; blank when either is missing or out of order. */
function elapsed(from: Date | null, to: Date | null, unit: number): number | '' {
  if (!from || !to || to < from) return '';
  return Math.round(((to.getTime() - from.getTime()) / unit) * 10) / 10;
}

@Injectable()
export class ManagerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── dashboard ──────────────────────────────────────────────────────────────

  async dashboard(query: DashboardQuery): Promise<DashboardData> {
    const { range } = query;
    const now = new Date();
    const since = range === 'all' ? null : addDays(startOfStoreDay(now), -(RANGE_DAYS[range] - 1));
    const prevSince = since && range !== 'all' ? addDays(since, -RANGE_DAYS[range]) : null;
    const granularity: 'day' | 'month' = range === '12m' || range === 'all' ? 'month' : 'day';

    const sinceSql = since ? Prisma.sql`AND o."createdAt" >= ${since}` : Prisma.empty;
    const bucketFmt = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    const [
      totalsRows,
      statusRows,
      seriesRows,
      productRows,
      cityRows,
      provinceRows,
      customerRows,
      previousRows,
      attentionRows,
      reviewAgg,
      latestReviews,
    ] = await Promise.all([
      this.prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT
          COALESCE(SUM(o.total) FILTER (WHERE ${REVENUE_SQL}), 0)                AS revenue,
          COUNT(*) FILTER (WHERE ${REVENUE_SQL})                                 AS orders,
          COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0)        AS delivered_revenue,
          COALESCE(SUM(o.total) FILTER (WHERE NOT (${REVENUE_SQL})), 0)          AS lost_value,
          COUNT(*) FILTER (WHERE NOT (${REVENUE_SQL}))                           AS lost_orders,
          COUNT(*) FILTER (WHERE ${REVENUE_SQL} AND o.shipping = 0)              AS free_delivery,
          COUNT(*) FILTER (WHERE ${REVENUE_SQL} AND o.shipping > 0)              AS paid_delivery,
          COUNT(*) FILTER (WHERE ${REVENUE_SQL} AND o."userId" IS NULL)          AS guest,
          COUNT(*) FILTER (WHERE ${REVENUE_SQL} AND o."userId" IS NOT NULL)      AS registered
        FROM orders o WHERE TRUE ${sinceSql}`,
      this.prisma.$queryRaw<{ status: string; n: bigint }[]>`
        SELECT o.status::text AS status, COUNT(*) AS n FROM orders o
        WHERE TRUE ${sinceSql} GROUP BY o.status`,
      this.prisma.$queryRaw<{ bucket: string; revenue: bigint; orders: bigint }[]>`
        SELECT to_char(${LOCAL_TS}, ${bucketFmt}) AS bucket,
               COALESCE(SUM(o.total), 0) AS revenue, COUNT(*) AS orders
        FROM orders o WHERE ${REVENUE_SQL} ${sinceSql}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ title: string; units: bigint; revenue: bigint; orders: bigint }[]>`
        SELECT i."titleSnapshot" AS title, SUM(i.quantity) AS units,
               SUM(i.quantity * i."priceSnapshot") AS revenue, COUNT(DISTINCT i."orderId") AS orders
        FROM order_items i JOIN orders o ON o.id = i."orderId"
        WHERE ${REVENUE_SQL} ${sinceSql}
        GROUP BY i."titleSnapshot" ORDER BY revenue DESC LIMIT 5`,
      this.prisma.$queryRaw<{ label: string; orders: bigint; revenue: bigint }[]>`
        SELECT initcap(btrim(o."shippingAddress"->>'city')) AS label,
               COUNT(*) AS orders, SUM(o.total) AS revenue
        FROM orders o WHERE ${REVENUE_SQL} ${sinceSql}
          AND btrim(COALESCE(o."shippingAddress"->>'city', '')) <> ''
        GROUP BY 1 ORDER BY revenue DESC LIMIT 8`,
      this.prisma.$queryRaw<{ label: string; orders: bigint; revenue: bigint }[]>`
        SELECT btrim(o."shippingAddress"->>'state') AS label,
               COUNT(*) AS orders, SUM(o.total) AS revenue
        FROM orders o WHERE ${REVENUE_SQL} ${sinceSql}
          AND btrim(COALESCE(o."shippingAddress"->>'state', '')) <> ''
        GROUP BY 1 ORDER BY revenue DESC`,
      this.prisma.$queryRaw<{ total: bigint; returning: bigint }[]>`
        WITH lifetime AS (
          SELECT lower(o.email) AS e, COUNT(*) AS n FROM orders o WHERE ${REVENUE_SQL} GROUP BY 1
        ), in_range AS (
          SELECT DISTINCT lower(o.email) AS e FROM orders o WHERE ${REVENUE_SQL} ${sinceSql}
        )
        SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE l.n >= 2) AS returning
        FROM in_range r JOIN lifetime l ON l.e = r.e`,
      prevSince && since
        ? this.prisma.$queryRaw<{ revenue: bigint; orders: bigint }[]>`
            SELECT COALESCE(SUM(o.total), 0) AS revenue, COUNT(*) AS orders FROM orders o
            WHERE ${REVENUE_SQL} AND o."createdAt" >= ${prevSince} AND o."createdAt" < ${since}`
        : Promise.resolve(null),
      this.prisma.$queryRaw<{ status: string; n: bigint }[]>`
        SELECT o.status::text AS status, COUNT(*) AS n FROM orders o
        WHERE o.status IN ('pending', 'confirmed') GROUP BY o.status`,
      this.prisma.review.aggregate({ _count: { _all: true }, _avg: { rating: true } }),
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, authorName: true, rating: true, comment: true, createdAt: true },
      }),
    ]);

    const t = totalsRows[0] ?? {};
    const revenue = num(t.revenue);
    const orders = num(t.orders);

    const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as DashboardData['statusCounts'];
    for (const r of statusRows) statusCounts[r.status as keyof typeof statusCounts] = num(r.n);
    const attention = Object.fromEntries(attentionRows.map((r) => [r.status, num(r.n)]));

    const cust = customerRows[0];
    const custTotal = num(cust?.total);
    const custReturning = num(cust?.returning);

    const ranked = (rows: { label: string; orders: bigint; revenue: bigint }[]): DashboardRanked[] =>
      rows.map((r) => ({ label: r.label, orders: num(r.orders), revenue: num(r.revenue) }));

    return {
      range,
      since: since ? since.toISOString() : null,
      granularity,
      totals: {
        revenue,
        orders,
        averageOrderValue: orders ? Math.round(revenue / orders) : 0,
        deliveredRevenue: num(t.delivered_revenue),
        lostValue: num(t.lost_value),
        lostOrders: num(t.lost_orders),
        freeDeliveryOrders: num(t.free_delivery),
        paidDeliveryOrders: num(t.paid_delivery),
        guestOrders: num(t.guest),
        registeredOrders: num(t.registered),
      },
      previous: previousRows
        ? { revenue: num(previousRows[0]?.revenue), orders: num(previousRows[0]?.orders) }
        : null,
      customers: { total: custTotal, new: custTotal - custReturning, returning: custReturning },
      statusCounts,
      needsAttention: { pending: num(attention.pending), toFulfil: num(attention.confirmed) },
      series: this.fillSeries(seriesRows, since, granularity, now),
      topProducts: productRows.map((r) => ({
        label: r.title,
        orders: num(r.orders),
        units: num(r.units),
        revenue: num(r.revenue),
      })),
      topCities: ranked(cityRows),
      provinces: ranked(provinceRows),
      reviews: {
        total: reviewAgg._count._all,
        averageRating: reviewAgg._avg.rating === null ? null : Math.round(reviewAgg._avg.rating * 10) / 10,
        latest: latestReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      },
    };
  }

  /** Zero-fill empty days/months so the chart's x-axis is continuous. */
  private fillSeries(
    rows: { bucket: string; revenue: bigint; orders: bigint }[],
    since: Date | null,
    granularity: 'day' | 'month',
    now: Date,
  ): DashboardBucket[] {
    const byKey = new Map(rows.map((r) => [r.bucket, r]));
    const keyOf = (d: Date) =>
      new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, granularity === 'day' ? 10 : 7);

    let start = since;
    if (!start) {
      const first = rows[0]?.bucket;
      if (!first) return [];
      start = parseStoreDay(`${first}-01`);
    }
    const out: DashboardBucket[] = [];
    const endKey = keyOf(now);
    let cursor = granularity === 'month' ? parseStoreDay(`${keyOf(start)}-01`) : start;
    for (let guard = 0; guard < 800; guard++) {
      const key = keyOf(cursor);
      const hit = byKey.get(key);
      out.push({ date: key, revenue: num(hit?.revenue), orders: num(hit?.orders) });
      if (key >= endKey) break;
      if (granularity === 'day') {
        cursor = addDays(cursor, 1);
      } else {
        // First instant of the next store-local month.
        const local = new Date(cursor.getTime() + 5 * 3600_000);
        cursor = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 5 * 3600_000);
      }
    }
    return out;
  }

  // ── CSV exports ────────────────────────────────────────────────────────────

  private dateWhere(from?: string, to?: string): Prisma.OrderWhereInput {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = parseStoreDay(from);
    if (to) createdAt.lt = addDays(parseStoreDay(to), 1); // inclusive of the `to` day
    return from || to ? { createdAt } : {};
  }

  async exportOrders(query: OrdersExportQuery): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { ...this.dateWhere(query.from, query.to), ...(query.status ? { status: query.status } : {}) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const orderCols = (o: (typeof orders)[number]): CsvCell[] => {
      const a = addr(o.shippingAddress);
      return [
        orderNumber(o.id),
        formatStoreDateTime(o.createdAt),
        o.status,
        o.paymentMethod === 'cod' ? 'COD' : 'Card',
        o.email,
        a.name,
        a.phone,
        o.userId ? 'Registered' : 'Guest',
        [a.line1, a.line2].filter(Boolean).join(', '),
        a.city,
        a.state,
        a.postalCode,
        o.trackingNumber,
        o.confirmedAt ? formatStoreDateTime(o.confirmedAt) : '',
        o.shippedAt ? formatStoreDateTime(o.shippedAt) : '',
        o.deliveredAt ? formatStoreDateTime(o.deliveredAt) : '',
        elapsed(o.createdAt, o.confirmedAt, 3_600_000), // hours to confirm
        elapsed(o.createdAt, o.shippedAt, 86_400_000), // days to ship
        elapsed(o.shippedAt, o.deliveredAt, 86_400_000), // days in transit
        elapsed(o.createdAt, o.deliveredAt, 86_400_000), // days to deliver
      ];
    };
    const orderHeader = [
      'Order #', 'Date (PKT)', 'Status', 'Payment', 'Email', 'Customer name', 'Phone',
      'Account', 'Address', 'City', 'Province', 'Postal code', 'Tracking #',
      'Confirmed on (PKT)', 'Shipped on (PKT)', 'Delivered on (PKT)',
      'Hours to confirm', 'Days to ship', 'Days in transit', 'Days to deliver',
    ];

    if (query.mode === 'items') {
      const rows = orders.flatMap((o) =>
        o.items.map((i): CsvCell[] => [
          ...orderCols(o),
          i.titleSnapshot,
          i.quantity,
          money(i.priceSnapshot),
          money(i.priceSnapshot * i.quantity),
          i.customNameSnapshot,
          i.customColorLabelSnapshot,
        ]),
      );
      return toCsv(
        [...orderHeader, 'Item', 'Qty', 'Unit price (PKR)', 'Line total (PKR)', 'Personalized name', 'Color'],
        rows,
      );
    }

    return toCsv(
      [...orderHeader, 'Items', 'Subtotal (PKR)', 'Shipping (PKR)', 'Tax (PKR)', 'Total (PKR)'],
      orders.map((o) => [
        ...orderCols(o),
        o.items.reduce((n, i) => n + i.quantity, 0),
        money(o.subtotal),
        money(o.shipping),
        money(o.tax),
        money(o.total),
      ]),
    );
  }

  /** One row per customer (grouped by email) — recurring vs one-time, location, spend. */
  async exportCustomers(query: CustomersExportQuery): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: this.dateWhere(query.from, query.to),
      select: {
        email: true,
        userId: true,
        status: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    interface Agg {
      email: string;
      name?: string;
      phone?: string;
      city?: string;
      province?: string;
      registered: boolean;
      orders: number;
      spent: number;
      cancelled: number;
      first: Date;
      last: Date;
      codOrders: number;
    }
    const byEmail = new Map<string, Agg>();
    for (const o of orders) {
      const key = o.email.trim().toLowerCase();
      const a = addr(o.shippingAddress);
      const counted = !(NON_REVENUE_STATUSES as readonly string[]).includes(o.status);
      const cur =
        byEmail.get(key) ??
        ({
          email: key, registered: false, orders: 0, spent: 0, cancelled: 0,
          first: o.createdAt, last: o.createdAt, codOrders: 0,
        } as Agg);
      // Orders are ascending, so the latest order's details win.
      cur.name = a.name ?? cur.name;
      cur.phone = a.phone ?? cur.phone;
      cur.city = a.city ?? cur.city;
      cur.province = a.state ?? cur.province;
      cur.registered = cur.registered || o.userId !== null;
      cur.last = o.createdAt;
      if (counted) {
        cur.orders += 1;
        cur.spent += o.total;
        if (o.paymentMethod === 'cod') cur.codOrders += 1;
      } else {
        cur.cancelled += 1;
      }
      byEmail.set(key, cur);
    }

    const now = Date.now();
    const rows = [...byEmail.values()]
      .filter((c) => {
        if (query.segment === 'recurring') return c.orders >= 2;
        if (query.segment === 'one_time') return c.orders === 1;
        return true;
      })
      .sort((a, b) => b.spent - a.spent)
      .map((c): CsvCell[] => [
        c.email,
        c.name,
        c.phone,
        c.registered ? 'Registered' : 'Guest',
        c.city,
        c.province,
        c.orders >= 2 ? 'Recurring' : c.orders === 1 ? 'One-time' : 'No completed orders',
        c.orders,
        money(c.spent),
        c.orders ? money(Math.round(c.spent / c.orders)) : '',
        c.cancelled,
        formatStoreDateTime(c.first).slice(0, 10),
        formatStoreDateTime(c.last).slice(0, 10),
        Math.floor((now - c.last.getTime()) / 86_400_000),
      ]);

    return toCsv(
      [
        'Email', 'Name', 'Phone', 'Account', 'City', 'Province', 'Customer type',
        'Orders', 'Total spent (PKR)', 'Avg order value (PKR)', 'Cancelled/refunded orders',
        'First order', 'Last order', 'Days since last order',
      ],
      rows,
    );
  }
}
