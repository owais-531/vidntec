import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PreviewController } from './preview.controller';
import { AdminPreviewController } from './admin-preview.controller';
import { PreviewService } from './preview.service';
import { PreviewReferencesService } from './preview-references.service';

// PrismaService / CloudinaryService come from their global modules, same as ProductsModule.
@Module({
  imports: [AuthModule],
  controllers: [PreviewController, AdminPreviewController],
  providers: [PreviewService, PreviewReferencesService],
})
export class PreviewModule {}
