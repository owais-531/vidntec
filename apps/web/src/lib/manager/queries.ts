import 'server-only';
import type {
  AdminOrderListItem,
  AdminOrderListQuery,
  AdminReview,
  AdminReviewListQuery,
  DashboardData,
  DashboardRange,
  OrderDetail,
} from '@vidntec/shared';
import { apiFetch, ApiRequestError } from '../api';
import type { Paginated } from '../admin/queries';

export function listOrders(
  query: Partial<AdminOrderListQuery>,
): Promise<Paginated<AdminOrderListItem>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return apiFetch<Paginated<AdminOrderListItem>>(`/manager/orders${qs ? `?${qs}` : ''}`);
}


export async function getManagerOrder(id: string): Promise<OrderDetail | null> {
  try {
    return await apiFetch<OrderDetail>(`/manager/orders/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}


export function listReviewsAdmin(
  query: Partial<AdminReviewListQuery>,
): Promise<Paginated<AdminReview>> {
  const params = new URLSearchParams();
  if (query.productId) params.set('productId', query.productId);
  if (query.rating) params.set('rating', String(query.rating));
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return apiFetch<Paginated<AdminReview>>(`/manager/reviews${qs ? `?${qs}` : ''}`);
}

export function getDashboard(range: DashboardRange): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/manager/dashboard?range=${range}`);
}
