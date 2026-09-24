'use server';

import type { ChatMessage, ChatResponse } from '@vidntec/shared';
import { apiFetch } from '../api';
import { runAction, type ActionResult } from './result';

/** Stateless — no cookies to forward, nothing persisted server-side. */
export async function sendChatMessageAction(
  messages: ChatMessage[],
): Promise<ActionResult<ChatResponse>> {
  return runAction(() =>
    apiFetch<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      forwardCookies: false,
    }),
  );
}
