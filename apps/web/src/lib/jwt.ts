import { jwtVerify } from 'jose';
import { JWT_AUDIENCE, JWT_ISSUER, accessTokenClaimsSchema, type AccessTokenClaims } from '@vidntec/shared';

/**
 * Verify a vidntec access token (HS256). Works in both the Edge middleware and
 * Node server components. Returns null on any failure (missing/expired/bad sig).
 * The API's AdminGuard remains the authoritative check on every admin endpoint.
 */
export async function verifyAccessToken(token: string | undefined): Promise<AccessTokenClaims | null> {
  if (!token) return null;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not set');
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    const parsed = accessTokenClaimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
