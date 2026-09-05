import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  shippingRateInputSchema,
  shippingRateUpdateSchema,
  type ShippingRateInput,
  type ShippingRateUpdate,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ShippingService } from './shipping.service';

@UseGuards(AdminGuard)
@Controller('admin/shipping/rates')
export class AdminShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get()
  list() {
    return this.shipping.listAll();
  }

  @Post()
  create(@Body(new ZodValidationPipe(shippingRateInputSchema)) body: ShippingRateInput) {
    return this.shipping.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(shippingRateUpdateSchema)) body: ShippingRateUpdate,
  ) {
    return this.shipping.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.shipping.remove(id);
  }
}
