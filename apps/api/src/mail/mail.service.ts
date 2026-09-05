import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { Resend } from 'resend';
import type { ShippingAddress } from '@vidntec/shared';
import type { Env } from '../config/env';
import {
  orderConfirmationEmail,
  passwordResetEmail,
  shippingNotificationEmail,
  verificationOtpEmail,
} from './templates';

interface Line {
  titleSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

export interface OrderEmailPayload {
  to: string;
  orderId: string;
  paymentMethod: 'stripe' | 'cod';
  items: Line[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: ShippingAddress;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly resend: Resend | null;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('EMAIL_FROM', { infer: true });
    const key = config.get('RESEND_API_KEY', { infer: true });
    // A real Resend key is `re_` + a long token (letters/digits/underscore/
    // hyphen). Anything shorter (e.g. the `re_xxx` placeholder) drops to
    // log-only mode so local dev works.
    const looksReal = /^re_[A-Za-z0-9_-]{20,}$/.test(key);
    this.resend = looksReal ? new Resend(key) : null;
    if (!looksReal) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged, not sent');
    }
  }

  async sendOrderConfirmation(payload: OrderEmailPayload): Promise<void> {
    const { subject, html } = orderConfirmationEmail(payload);
    await this.send(payload.to, subject, html, `order-confirmation ${payload.orderId}`);
  }

  async sendShippingNotification(payload: {
    to: string;
    orderId: string;
    trackingNumber: string;
    items: Line[];
    currency: string;
  }): Promise<void> {
    const { subject, html } = shippingNotificationEmail(payload);
    await this.send(payload.to, subject, html, `shipping ${payload.orderId}`);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const { subject, html } = passwordResetEmail(resetUrl);
    await this.send(to, subject, html, `password-reset ${to}`);
  }

  async sendVerificationOtp(to: string, code: string): Promise<void> {
    const { subject, html } = verificationOtpEmail(code);
    // The code is embedded in the tag (not just the body) so it's visible in
    // the log-only dev fallback below, which never logs the HTML body.
    await this.send(to, subject, html, `verify-otp code=${code} ${to}`);
  }

  private async send(to: string, subject: string, html: string, tag: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[mail:log-only] ${tag} -> ${to} :: "${subject}"`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) throw new Error(error.message);
      this.logger.log(`[mail:sent] ${tag} -> ${to}`);
    } catch (err) {
      this.logger.error(`[mail:failed] ${tag} -> ${to}`, err as Error);
      Sentry.captureException(err, { tags: { email: tag } });
      // never rethrow — email failure must not roll back an order
    }
  }
}
