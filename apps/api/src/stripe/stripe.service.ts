import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { Env } from '../config/env';

@Injectable()
export class StripeService {
  readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY', { infer: true }), {
      typescript: true,
    });
    this.webhookSecret = config.getOrThrow('STRIPE_WEBHOOK_SECRET', { infer: true });
  }

  /** Verify a webhook payload and return the typed event. Throws on bad signature. */
  constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }
}
