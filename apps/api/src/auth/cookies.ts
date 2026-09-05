import type { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from '@vidntec/shared';
import type { Env } from '../config/env';

function baseOptions(config: ConfigService<Env, true>): CookieOptions {
  const domain = config.get('AUTH_COOKIE_DOMAIN', { infer: true });
  return {
    httpOnly: true,
    secure: config.get('COOKIE_SECURE', { infer: true }),
    sameSite: config.get('COOKIE_SAMESITE', { infer: true }),
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService<Env, true>,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const opts = baseOptions(config);
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...opts,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...opts,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService<Env, true>): void {
  const opts = baseOptions(config);
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
}
