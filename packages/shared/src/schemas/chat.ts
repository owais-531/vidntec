import { z } from 'zod';
import { productSpecsSchema } from './product';

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

// ── admin: AI-drafted product "Scope" ───────────────────────────────────────

/** Everything the admin form currently knows about the product — sent from
 *  unsaved form state, so it works on the "new product" page too. */
export const scopeDraftRequestSchema = z.object({
  title: z.string().trim().min(1, 'Add a product title first').max(200),
  description: z.string().max(20_000).default(''),
  categoryName: z.string().max(100).optional(),
  specs: productSpecsSchema.default([]),
  variantNames: z.array(z.string().max(120)).max(50).default([]),
  /** Optional steer from the admin, e.g. "focus on load ratings". */
  instructions: z.string().trim().max(500).optional(),
});
export type ScopeDraftRequest = z.infer<typeof scopeDraftRequestSchema>;

export const scopeDraftResponseSchema = z.object({
  /** Sanitized HTML (p/strong/em/u/ul/li/br), ready for the Scope editor. */
  scope: z.string(),
});
export type ScopeDraftResponse = z.infer<typeof scopeDraftResponseSchema>;
