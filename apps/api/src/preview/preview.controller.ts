import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { previewRequestSchema, type PreviewRequest, type PreviewResponse } from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PreviewService } from './preview.service';

// Coarse backstop only — the web app calls this server-to-server, so every
// customer shares one IP here. The real limits are per-visitor and global, in the DB.
const PREVIEW_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@Controller('products/:slug/preview')
export class PreviewController {
  constructor(private readonly preview: PreviewService) {}

  @Post()
  @HttpCode(200)
  @Throttle(PREVIEW_THROTTLE)
  generate(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(previewRequestSchema)) body: PreviewRequest,
  ): Promise<PreviewResponse> {
    return this.preview.generateForStorefront(slug, body);
  }
}
