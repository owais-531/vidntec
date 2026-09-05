import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ACCESS_TOKEN_COOKIE } from '@vidntec/shared';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import type { AuthenticatedUser } from '../auth.types';

/**
 * Never blocks the request. Attaches `req.user` when a valid access token is
 * present — used by cart/checkout where guests are allowed.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (token) {
      try {
        const claims = this.tokens.verifyAccessToken(token);
        req.user = { id: claims.sub, email: claims.email, role: claims.role };
      } catch {
        /* ignore — treat as guest */
      }
    }
    return true;
  }
}
