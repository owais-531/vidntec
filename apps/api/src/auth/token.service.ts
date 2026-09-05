import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  type AccessTokenClaims,
} from '@vidntec/shared';
import type { Env } from '../config/env';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class TokenService {
  private readonly accessSecret: string;

  constructor(config: ConfigService<Env, true>) {
    this.accessSecret = config.getOrThrow('JWT_ACCESS_SECRET', { infer: true });
  }

  /** Sign a short-lived access JWT (HS256). */
  signAccessToken(user: AuthenticatedUser): string {
    const payload: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    return jwt.sign(payload, this.accessSecret, {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  /** Verify an access JWT. Throws if invalid/expired. */
  verifyAccessToken(token: string): AccessTokenClaims {
    const decoded = jwt.verify(token, this.accessSecret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const claims = decoded as AccessTokenClaims;
    if (claims.type !== 'access') {
      throw new Error('wrong token type');
    }
    return claims;
  }

  /**
   * Refresh tokens are opaque random strings (not JWTs). Only the SHA-256 hash
   * is stored, so a DB leak does not expose usable tokens.
   */
  generateRefreshToken(): { token: string; tokenHash: string } {
    const token = randomBytes(48).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
