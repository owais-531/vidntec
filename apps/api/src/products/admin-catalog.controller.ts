import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  adminInventoryQuerySchema,
  uploadSignatureRequestSchema,
  type AdminInventoryQuery,
  type UploadSignatureRequest,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ProductsService } from './products.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly products: ProductsService) {}

  @Get('inventory')
  inventory(
    @Query(new ZodValidationPipe(adminInventoryQuerySchema)) query: AdminInventoryQuery,
  ) {
    return this.products.inventory(query.search);
  }

  /** Mint a signed Cloudinary upload payload for a direct browser -> Cloudinary upload. */
  @Post('uploads/signature')
  signUpload(
    @Body(new ZodValidationPipe(uploadSignatureRequestSchema)) body: UploadSignatureRequest,
  ) {
    return this.products.signUpload(body.folder);
  }
}
