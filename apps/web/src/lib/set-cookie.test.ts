import { describe, expect, it } from 'vitest';
import { parseAuthSetCookies } from './set-cookie';

describe('parseAuthSetCookies', () => {
  it('extracts only the auth cookies with their attributes', () => {
    const parsed = parseAuthSetCookies([
      'vidntec_at=abc.def.ghi; Path=/; HttpOnly; SameSite=Lax; Max-Age=900',
      'vidntec_rt=opaquetoken; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000',
      'other=nope; Path=/',
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      name: 'vidntec_at',
      value: 'abc.def.ghi',
      options: { httpOnly: true, secure: false, path: '/', sameSite: 'lax', maxAge: 900 },
    });
    expect(parsed[1]!.options).toMatchObject({ secure: true, sameSite: 'none', maxAge: 2592000 });
  });

  it('ignores malformed headers', () => {
    expect(parseAuthSetCookies(['', 'garbage', 'vidntec_at'])).toEqual([]);
  });
});
