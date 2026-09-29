import OpenAI from 'openai';

/**
 * Same "looks real" placeholder-detection convention as MailService's
 * RESEND_API_KEY check: a placeholder key (e.g. Railway's "abc") yields `null`
 * so callers degrade gracefully instead of crashing boot or 401ing per request.
 */
export function createOpenAiClient(key: string): OpenAI | null {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(key) ? new OpenAI({ apiKey: key }) : null;
}
