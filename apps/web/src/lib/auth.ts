import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_TOKEN_COOKIE, type MeResponse, type PublicUser, type Role } from '@vidntec/shared';
import { apiFetch } from './api';
import { verifyAccessToken } from './jwt';

/**
 * Fast, network-free session read from the access-token cookie. Use for
 * conditional rendering. For anything security-sensitive prefer `fetchCurrentUser`
 * (hits the API, reflects DB role changes) and always rely on the API guards.
 */
export async function getSessionClaims() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  return verifyAccessToken(token);
}

/** Authoritative current user via GET /auth/me (with silent refresh on 401). */
export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const { user } = await apiFetch<MeResponse>('/auth/me');
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<PublicUser> {
  const user = await fetchCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(role: Role): Promise<PublicUser> {
  const user = await fetchCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== role) redirect('/');
  return user;
}

export const requireAdmin = () => requireRole('admin');
