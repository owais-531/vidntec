'use server';

import type { RefundRequestInput, UploadSignatureResponse } from '@vidntec/shared';
import { apiFetch } from '../api';
import { runAction, type ActionResult } from './result';

/** No auth required — guests (the common case, guest checkout) and
 *  signed-in customers alike. Ownership is verified server-side by matching
 *  the email against the order before anything gets emailed. */
export async function submitRefundRequestAction(
  input: RefundRequestInput,
): Promise<ActionResult> {
  return runAction(() =>
    apiFetch<undefined>('/refund-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}

export async function getRefundRequestUploadSignatureAction(): Promise<
  ActionResult<UploadSignatureResponse>
> {
  return runAction(() =>
    apiFetch<UploadSignatureResponse>('/refund-requests/uploads/signature', { method: 'POST' }),
  );
}
