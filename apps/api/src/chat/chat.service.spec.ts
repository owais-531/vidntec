import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

const ENV: Record<string, string> = {
  WEB_ORIGIN: 'http://web',
  OPENAI_API_KEY: 'sk-realtestkey1234567890abcdef',
};

function make(openaiKey = ENV.OPENAI_API_KEY) {
  const storefront = {
    list: vi.fn().mockResolvedValue({
      items: [
        { title: 'Desk Dragon', slug: 'desk-dragon', priceMin: 149900, priceMax: 149900, onSale: false, inStock: true },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    }),
  };
  const categories = { listPublic: vi.fn().mockResolvedValue([{ name: 'Toys', slug: 'toys' }]) };
  const shipping = {
    listActive: vi.fn().mockResolvedValue([{ id: 'r1', name: 'Standard', price: 20000, minOrderForFree: 500000, active: true }]),
  };
  const settings = {
    getDto: vi.fn().mockResolvedValue({
      taxEnabled: false,
      taxRateBps: 0,
      taxLabel: 'Tax',
      currency: 'pkr',
      storeName: 'VIDNTEC',
      supportEmail: '',
    }),
  };
  const orders = {
    lookup: vi.fn(),
    getForCustomer: vi.fn(),
  };
  const config = {
    get: vi.fn((key: string) => (key === 'OPENAI_API_KEY' ? openaiKey : ENV[key])),
  } as unknown as ConfigService;

  const service = new ChatService(
    config as never,
    storefront as never,
    categories as never,
    shipping as never,
    settings as never,
    orders as never,
  );
  return { service, storefront, categories, shipping, settings, orders };
}

/** Swap in a fake OpenAI client — ChatService has no DI seam for the SDK
 *  client (same shape as MailService's Resend client), so tests reach past
 *  the private field, matching this repo's existing "construct directly,
 *  mock fields" test style (see checkout.service.spec.ts). */
function withFakeClient(service: ChatService, create: (...args: unknown[]) => unknown) {
  (service as unknown as { client: unknown }).client = {
    chat: { completions: { create } },
  };
}

describe('ChatService.reply', () => {
  let ctx: ReturnType<typeof make>;
  beforeEach(() => {
    ctx = make();
  });

  it('falls back to a WhatsApp/email hand-off when the API key looks like a placeholder', async () => {
    const placeholderCtx = make('sk-xxx'); // too short to "look real"
    const reply = await placeholderCtx.service.reply([{ role: 'user', content: 'hi' }]);
    expect(reply).toContain('wa.me');
    expect(reply).toContain('info@vidntec.com');
  });

  it('returns the model reply directly when no tool call is made', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'We ship within Pakistan only.', tool_calls: undefined } }],
    });
    withFakeClient(ctx.service, create);

    const reply = await ctx.service.reply([{ role: 'user', content: 'Do you ship internationally?' }]);
    expect(reply).toBe('We ship within Pakistan only.');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('runs the search_products tool and feeds the result back for a second completion', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'search_products', arguments: JSON.stringify({ query: 'dragon' }) },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'We have the Desk Dragon for Rs 1,499.' } }],
      });
    withFakeClient(ctx.service, create);

    const reply = await ctx.service.reply([{ role: 'user', content: 'do you sell a dragon?' }]);

    expect(ctx.storefront.list).toHaveBeenCalledWith(expect.objectContaining({ q: 'dragon', pageSize: 5 }));
    expect(reply).toBe('We have the Desk Dragon for Rs 1,499.');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('runs the lookup_order_status tool against a guest order', async () => {
    ctx.orders.lookup.mockResolvedValue({ orderId: 'order_123' });
    ctx.orders.getForCustomer.mockResolvedValue({
      status: 'fulfilled',
      items: [{ titleSnapshot: 'Desk Dragon', quantity: 1 }],
      total: 149900,
      currency: 'pkr',
      trackingNumber: 'TCS999',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'lookup_order_status',
                    arguments: JSON.stringify({ reference: 'ABCD1234', email: 'a@b.com' }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Your order has shipped — tracking TCS999.' } }],
      });
    withFakeClient(ctx.service, create);

    const reply = await ctx.service.reply([{ role: 'user', content: "where's my order ABCD1234, a@b.com" }]);

    expect(ctx.orders.lookup).toHaveBeenCalledWith('ABCD1234', 'a@b.com');
    expect(ctx.orders.getForCustomer).toHaveBeenCalledWith('order_123', undefined, 'a@b.com');
    expect(reply).toBe('Your order has shipped — tracking TCS999.');
  });

  it('never leaks a mismatched/nonexistent order — the tool reports "not found" instead of throwing', async () => {
    ctx.orders.lookup.mockRejectedValue(new Error('Order not found'));
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'lookup_order_status',
                    arguments: JSON.stringify({ reference: 'nope', email: 'a@b.com' }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "I couldn't find that order." } }],
      });
    withFakeClient(ctx.service, create);

    const reply = await ctx.service.reply([{ role: 'user', content: 'track order nope, a@b.com' }]);
    expect(reply).toBe("I couldn't find that order.");
  });

  it('falls back to the hand-off message if the OpenAI call throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('network error'));
    withFakeClient(ctx.service, create);

    const reply = await ctx.service.reply([{ role: 'user', content: 'hi' }]);
    expect(reply).toContain('wa.me');
  });
});
