import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import type { AuthenticatedUser } from './auth.types';

function makeService(secret = 'x'.repeat(40)): TokenService {
  const config = { getOrThrow: () => secret } as unknown as ConfigService;
  return new TokenService(config as never);
}

const user: AuthenticatedUser = { id: 'u1', email: 'a@b.com', role: 'customer' };

describe('TokenService', () => {
  it('signs and verifies an access token round-trip', () => {
    const svc = makeService();
    const token = svc.signAccessToken(user);
    const claims = svc.verifyAccessToken(token);
    expect(claims).toMatchObject({ sub: 'u1', email: 'a@b.com', role: 'customer', type: 'access' });
  });

  it('rejects a token signed with a different secret', () => {
    const token = makeService('secret-a-secret-a-secret-a-secret-a').signAccessToken(user);
    expect(() =>
      makeService('secret-b-secret-b-secret-b-secret-b').verifyAccessToken(token),
    ).toThrow();
  });

  it('rejects a tampered token', () => {
    const svc = makeService();
    const token = svc.signAccessToken(user);
    expect(() => svc.verifyAccessToken(`${token}x`)).toThrow();
  });

  it('produces opaque refresh tokens stored only as a hash', () => {
    const svc = makeService();
    const { token, tokenHash } = svc.generateRefreshToken();
    expect(token).not.toEqual(tokenHash);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(svc.hash(token)).toEqual(tokenHash);
  });
});
