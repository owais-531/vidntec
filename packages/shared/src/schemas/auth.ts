import { z } from 'zod';

/**
 * NOTE: there is deliberately NO `role` field accepted anywhere in these
 * schemas. Every signup is `role = 'customer'`, enforced server-side and at the
 * DB level. The `admin` role is granted only manually in the database.
 */

const passwordSchema = z
  .string()
  .min(10, 'password must be at least 10 characters')
  .max(200, 'password is too long');

export const signupSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/, 'enter the 6-digit code'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
});
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

/** Shape of the authenticated user returned to clients (never includes passwordHash). */
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'admin']),
  createdAt: z.string().datetime(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** Decoded access-token claims (the payload we sign; `iss`/`aud`/`exp` are added by the signer). */
export const accessTokenClaimsSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'admin']),
  type: z.literal('access'),
});
export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

/** `GET /auth/me` response. */
export const meResponseSchema = z.object({
  user: publicUserSchema.nullable(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** Generic `{ ok: true }` used by logout / forgot-password / reset-password. */
export const okResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof okResponseSchema>;
