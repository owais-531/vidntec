import type { Role } from '@vidntec/shared';

/** Shape attached to `req.user` by the auth guards. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

/** Express request augmented with the authenticated user (may be absent for guests). */
export interface RequestWithUser {
  user?: AuthenticatedUser;
  cookies: Record<string, string | undefined>;
}
