import * as argon2 from 'argon2';

/**
 * Centralised password hashing so the API auth service and the seed script use
 * identical parameters. argon2id, memory/time cost tuned for a web login path.
 * Passwords are HASHED — never encrypted, never stored in plaintext.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB (OWASP baseline)
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

/** True when a stored hash was produced with weaker params and should be re-hashed on next login. */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}
