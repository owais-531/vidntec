import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(500),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Client sends the whole (short) conversation each turn — nothing is
 *  persisted server-side, so there's no conversation id to key off. */
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(10),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  reply: z.string(),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;
