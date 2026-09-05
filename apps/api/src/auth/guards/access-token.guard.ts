import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ACCESS_TOKEN_COOKIE } from '@vidntec/shared';
import * as Sentry from '@sentry/nestjs';
import type { Request } from 'express';
import { TokenService } from '../token.service';
import type { AuthenticatedUser } from '../auth.types';

/** Requires a valid access-token cookie; attaches `req.user`. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }
    try {
      const claims = this.tokens.verifyAccessToken(token);
      req.user = { id: claims.sub, email: claims.email, role: claims.role };
      Sentry.setUser({ id: claims.sub, email: claims.email });
      return true;
    } catch {
      throw new UnauthorizedException('Session expired');
    }
  }
}
