import { z } from 'zod';

/** Treat an unset OR empty-string env var as "not provided". */
const optionalUrl = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.string().url().optional(),
);
const optionalString = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.string().optional(),
);

/**
 * Single source of truth for API environment variables. Parsed once at boot;
 * the process exits if anything required is missing or malformed.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database (Railway Postgres) — a single connection string for both runtime and migrations.
  DATABASE_URL: z.string().url(),

  // Auth — hand-rolled JWT. Separate secrets for access vs refresh.
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  AUTH_COOKIE_DOMAIN: optionalString, // e.g. ".vidntec.com" in prod; unset for localhost
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Cross-domain prod (web on Vercel, api on Railway) needs 'none'. 'lax' is fine
  // for local dev where the browser hits the API same-site.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // CORS — the storefront origin allowed to send credentialed requests.
  WEB_ORIGIN: z.string().url(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Resend
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1), // "vidntec <orders@vidntec.com>"

  // Sentry
  SENTRY_DSN: optionalUrl,
  SENTRY_ENVIRONMENT: optionalString,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid API environment:\n${issues}`);
  }
  return parsed.data;
}
