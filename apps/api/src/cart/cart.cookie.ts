import type { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CART_COOKIE, CART_COOKIE_TTL_SECONDS } from '@vidntec/shared';
import type { Env } from '../config/env';

function options(config: ConfigService<Env, true>): CookieOptions {
  const domain = config.get('AUTH_COOKIE_DOMAIN', { infer: true });
  return {
    httpOnly: true,
    secure: config.get('COOKIE_SECURE', { infer: true }),
    sameSite: config.get('COOKIE_SAMESITE', { infer: true }),
    path: '/',
    maxAge: CART_COOKIE_TTL_SECONDS * 1000,
    ...(domain ? { domain } : {}),
  };
}

export function setCartCookie(
  res: Response,
  config: ConfigService<Env, true>,
  cartId: string,
): void {
  res.cookie(CART_COOKIE, cartId, options(config));
}

export function clearCartCookie(res: Response, config: ConfigService<Env, true>): void {
  const { maxAge: _maxAge, ...rest } = options(config);
  res.clearCookie(CART_COOKIE, rest);
}
