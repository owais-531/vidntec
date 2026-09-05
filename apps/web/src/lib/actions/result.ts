import { ApiRequestError } from '../api';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Run an API call and normalise failures into an ActionResult. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return {
        ok: false,
        error: Array.isArray(err.body.message) ? err.body.message.join(', ') : err.body.message,
        fieldErrors: err.body.fieldErrors,
      };
    }
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
