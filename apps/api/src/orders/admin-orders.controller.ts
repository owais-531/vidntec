import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  adminOrderListQuerySchema,
  fulfillOrderSchema,
  refundOrderSchema,
  setOrderStatusSchema,
  type AdminOrderListQuery,
  type FulfillOrderInput,
  type RefundOrderInput,
  type SetOrderStatusInput,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OrdersService } from './orders.service';

@UseGuards(AdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminOrderListQuerySchema)) query: AdminOrderListQuery,
  ) {
    return this.orders.adminList(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.adminGet(id);
  }

  /** Permanently delete an order (history cleanup). Does not adjust stock. */
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.orders.remove(id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@Param('id') id: string) {
    return this.orders.confirmOrder(id);
  }

  @Post(':id/fulfill')
  @HttpCode(200)
  fulfill(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(fulfillOrderSchema)) body: FulfillOrderInput,
  ) {
    return this.orders.fulfill(id, body.trackingNumber);
  }

  @Post(':id/deliver')
  @HttpCode(200)
  markDelivered(@Param('id') id: string) {
    return this.orders.markDelivered(id);
  }

  /** Manual override: set any status. No email / no Stripe refund; adjusts stock. */
  @Post(':id/status')
  @HttpCode(200)
  setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setOrderStatusSchema)) body: SetOrderStatusInput,
  ) {
    return this.orders.setStatus(id, body.status);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return this.orders.cancel(id);
  }

  @Post(':id/refund')
  @HttpCode(200)
  refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(refundOrderSchema)) body: RefundOrderInput,
  ) {
    return this.orders.refund(id, body.reason);
  }
}
