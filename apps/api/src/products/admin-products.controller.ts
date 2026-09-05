import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  adminProductListQuerySchema,
  attachImageSchema,
  createProductSchema,
  reorderImagesSchema,
  updateProductSchema,
  variantInputSchema,
  type AdminProductListQuery,
  type AttachImageInput,
  type CreateProductInput,
  type ReorderImagesInput,
  type UpdateProductInput,
  type VariantInput,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ProductsService } from './products.service';

@UseGuards(AdminGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminProductListQuerySchema)) query: AdminProductListQuery,
  ) {
    return this.products.list(query);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createProductSchema)) body: CreateProductInput) {
    return this.products.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
  ) {
    return this.products.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.products.remove(id);
  }

  // ── variants (nested add) ─────────────────────────────────────────────────

  @Post(':id/variants')
  addVariant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(variantInputSchema)) body: VariantInput,
  ) {
    return this.products.addVariant(id, body);
  }

  // ── images ───────────────────────────────────────────────────────────────

  @Post(':id/images')
  attachImage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(attachImageSchema)) body: AttachImageInput,
  ) {
    return this.products.attachImage(id, body);
  }

  @Patch(':id/images/reorder')
  reorderImages(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reorderImagesSchema)) body: ReorderImagesInput,
  ) {
    return this.products.reorderImages(id, body.imageIds);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(204)
  async removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.products.removeImage(id, imageId);
  }
}
