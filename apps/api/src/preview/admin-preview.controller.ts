import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  attachPreviewReferenceSchema,
  previewTestRequestSchema,
  updatePreviewReferenceSchema,
  type AttachPreviewReferenceInput,
  type PreviewResponse,
  type PreviewTestRequest,
  type UpdatePreviewReferenceInput,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PreviewService } from './preview.service';
import { PreviewReferencesService } from './preview-references.service';

// Admin-only but still a paid API — cap accidental double-clicks/loops.
const TEST_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@UseGuards(AdminGuard)
@Controller('admin/products/:id')
export class AdminPreviewController {
  constructor(
    private readonly preview: PreviewService,
    private readonly references: PreviewReferencesService,
  ) {}

  @Post('preview-references')
  attach(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(attachPreviewReferenceSchema)) body: AttachPreviewReferenceInput,
  ) {
    return this.references.attach(id, body);
  }

  @Patch('preview-references/:referenceId')
  setLetters(
    @Param('id') id: string,
    @Param('referenceId') referenceId: string,
    @Body(new ZodValidationPipe(updatePreviewReferenceSchema)) body: UpdatePreviewReferenceInput,
  ) {
    return this.references.setLetters(id, referenceId, body);
  }

  @Delete('preview-references/:referenceId')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Param('referenceId') referenceId: string): Promise<void> {
    await this.references.remove(id, referenceId);
  }

  @Post('preview-test')
  @HttpCode(200)
  @Throttle(TEST_THROTTLE)
  test(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(previewTestRequestSchema)) body: PreviewTestRequest,
  ): Promise<PreviewResponse> {
    return this.preview.generateForAdmin(id, body);
  }
}
