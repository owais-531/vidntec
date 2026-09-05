import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  CART_COOKIE,
  checkoutSchema,
  quoteRequestSchema,
  type CheckoutInput,
  type CheckoutResult,
  type CheckoutSessionStatus,
  type Quote,
  type QuoteRequest,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CartService } from '../cart/cart.service';
import { CheckoutService } from './checkout.service';

@UseGuards(OptionalAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly cart: CartService,
  ) {}

  @Post('quote')
  @HttpCode(200)
  @SkipThrottle()
  async quote(
    @Body(new ZodValidationPipe(quoteRequestSchema)) body: QuoteRequest,
    @Req() req: Request,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<Quote> {
    const cartId = await this.resolveCartId(req, user);
    return this.checkout.quote(cartId, body.shippingRateId);
  }

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async placeOrder(
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutInput,
    @Req() req: Request,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CheckoutResult> {
    const cartId = await this.resolveCartId(req, user);
    return this.checkout.checkout(body, cartId, user?.id);
  }

  @Get('session/:id')
  @SkipThrottle()
  sessionStatus(@Param('id') id: string): Promise<CheckoutSessionStatus> {
    return this.checkout.sessionStatus(id);
  }

  private async resolveCartId(
    req: Request,
    user: AuthenticatedUser | undefined,
  ): Promise<string | null> {
    const cookieCartId = req.cookies?.[CART_COOKIE] as string | undefined;
    const { cartId } = await this.cart.resolve(cookieCartId, user?.id, false);
    return cartId;
  }
}
