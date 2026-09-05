import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  orderLookupSchema,
  type OrderDetail,
  type OrderLookupInput,
  type OrderLookupResult,
  type OrderSummary,
} from '@vidntec/shared';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Guest order tracking: order number OR tracking number + the checkout email. */
  @Post('orders/lookup')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  lookup(
    @Body(new ZodValidationPipe(orderLookupSchema)) body: OrderLookupInput,
  ): Promise<OrderLookupResult> {
    return this.orders.lookup(body.reference, body.email);
  }

  /** Guest: `?email=` must match. Registered-user order: must be signed in as the owner. */
  @Get('orders/:id')
  @UseGuards(OptionalAuthGuard)
  getOne(
    @Param('id') id: string,
    @Query('email') email?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OrderDetail> {
    return this.orders.getForCustomer(id, user, email);
  }

  @Get('account/orders')
  @UseGuards(AccessTokenGuard)
  mine(@CurrentUser() user: AuthenticatedUser): Promise<OrderSummary[]> {
    return this.orders.listForUser(user.id);
  }
}
