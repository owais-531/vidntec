import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  stockAdjustmentSchema,
  variantUpdateSchema,
  type StockAdjustmentInput,
  type VariantUpdate,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ProductsService } from './products.service';

@UseGuards(AdminGuard)
@Controller('admin/variants')
export class AdminVariantsController {
  constructor(private readonly products: ProductsService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(variantUpdateSchema)) body: VariantUpdate,
  ) {
    return this.products.updateVariant(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.products.removeVariant(id);
  }

  @Post(':id/stock')
  adjustStock(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(stockAdjustmentSchema)) body: StockAdjustmentInput,
  ) {
    return this.products.adjustStock(id, body);
  }
}
