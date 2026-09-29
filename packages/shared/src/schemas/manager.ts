import { z } from 'zod';
import { ORDER_STATUSES } from '../constants';

/** Dashboard date range presets. `all` = since the first order. */
export const DASHBOARD_RANGES = ['7d', '30d', '90d', '12m', 'all'] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const dashboardQuerySchema = z.object({
  range: z.enum(DASHBOARD_RANGES).default('30d'),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/** Revenue counts every order that is not cancelled or refunded. */
export const NON_REVENUE_STATUSES = ['cancelled', 'refunded'] as const;

export interface DashboardBucket {
  /** `YYYY-MM-DD` (daily) or `YYYY-MM` (monthly), Asia/Karachi. */
  date: string;
  revenue: number; // integer minor units
  orders: number;
}

export interface DashboardRanked {
  label: string;
  orders: number;
  units?: number;
  revenue: number;
}

export interface DashboardData {
  range: DashboardRange;
  /** ISO start of the range, null for `all`. */
  since: string | null;
  granularity: 'day' | 'month';
  totals: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    deliveredRevenue: number;
    /** Value of cancelled + refunded orders in the range (NOT in revenue). */
    lostValue: number;
    lostOrders: number;
    freeDeliveryOrders: number;
    paidDeliveryOrders: number;
    guestOrders: number;
    registeredOrders: number;
  };
  /** Same-length period immediately before the range; null for `all`. */
  previous: { revenue: number; orders: number } | null;
  customers: { total: number; new: number; returning: number };
  statusCounts: Record<(typeof ORDER_STATUSES)[number], number>;
  /** All-time, regardless of range — the manager's to-do list. */
  needsAttention: { pending: number; toFulfil: number };
  series: DashboardBucket[];
  topProducts: DashboardRanked[];
  topCities: DashboardRanked[];
  provinces: DashboardRanked[];
  reviews: {
    total: number;
    averageRating: number | null;
    latest: { id: string; authorName: string; rating: number | null; comment: string | null; createdAt: string }[];
  };
}

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .optional();

export const ordersExportQuerySchema = z.object({
  from: isoDay,
  to: isoDay,
  status: z.enum(ORDER_STATUSES).optional(),
  /** `orders` = one row per order, `items` = one row per line item. */
  mode: z.enum(['orders', 'items']).default('orders'),
});
export type OrdersExportQuery = z.infer<typeof ordersExportQuerySchema>;

export const customersExportQuerySchema = z.object({
  from: isoDay,
  to: isoDay,
  segment: z.enum(['all', 'recurring', 'one_time']).default('all'),
});
export type CustomersExportQuery = z.infer<typeof customersExportQuerySchema>;
