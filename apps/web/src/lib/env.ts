import { z } from 'zod';

/**
 * Server-side env for the web app. Public values must be prefixed NEXT_PUBLIC_
 * and are also validated here so a missing var fails the build, not a page load.
 */
const serverEnvSchema = z.object({
  // Base URL of the NestJS API (Railway), server-to-server calls.
  API_URL: z.string().url(),
  // Must match the API's JWT_ACCESS_SECRET — used to verify access tokens in
  // middleware and server components (verification only, never signing).
  JWT_ACCESS_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const optionalUrl = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.string().url().optional(),
);

const publicEnvSchema = z.object({
  // Same API, but used from the browser. Usually identical to API_URL.
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export const serverEnv = serverEnvSchema.parse({
  API_URL: process.env.API_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  NODE_ENV: process.env.NODE_ENV,
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
