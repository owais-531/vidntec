import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsService } from './products.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminVariantsController } from './admin-variants.controller';
import { AdminCatalogController } from './admin-catalog.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminProductsController, AdminVariantsController, AdminCatalogController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
