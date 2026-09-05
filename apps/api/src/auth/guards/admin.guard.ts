import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ACCESS_TOKEN_COOKIE } from '@vidntec/shared';
import * as Sentry from '@sentry/nestjs';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import type { AuthenticatedUser } from '../auth.types';

/**
 * The source of truth for admin access. Every admin endpoint is protected by
 * this guard — role is re-checked from a freshly verified token on every
 * request. (The Next.js middleware is a convenience gate, not a substitute.)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    let claims;
    try {
      claims = this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Session expired');
    }

    if (claims.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    req.user = { id: claims.sub, email: claims.email, role: claims.role };
    Sentry.setUser({ id: claims.sub, email: claims.email });
    return true;
  }
}
