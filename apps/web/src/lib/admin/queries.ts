import 'server-only';
import type {
  AdminOrderListItem,
  AdminOrderListQuery,
  AdminProduct,
  AdminProductListItem,
  AdminProductListQuery,
  InventoryItem,
  OrderDetail,
  ShippingRate,
  StoreSettings,
} from '@vidntec/shared';
import { apiFetch, ApiRequestError } from '../api';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function listProducts(
  query: Partial<AdminProductListQuery>,
): Promise<Paginated<AdminProductListItem>> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return apiFetch<Paginated<AdminProductListItem>>(`/admin/products${qs ? `?${qs}` : ''}`);
}

export async function getProduct(id: string): Promise<AdminProduct | null> {
  try {
    return await apiFetch<AdminProduct>(`/admin/products/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export function getInventory(search?: string): Promise<InventoryItem[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<InventoryItem[]>(`/admin/inventory${qs}`);
}

export function listOrders(
  query: Partial<AdminOrderListQuery>,
): Promise<Paginated<AdminOrderListItem>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return apiFetch<Paginated<AdminOrderListItem>>(`/admin/orders${qs ? `?${qs}` : ''}`);
}

export async function getAdminOrder(id: string): Promise<OrderDetail | null> {
  try {
    return await apiFetch<OrderDetail>(`/admin/orders/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export function getShippingRatesAdmin(): Promise<ShippingRate[]> {
  return apiFetch<ShippingRate[]>('/admin/shipping/rates');
}

export function getStoreSettings(): Promise<StoreSettings> {
  return apiFetch<StoreSettings>('/admin/settings');
}
