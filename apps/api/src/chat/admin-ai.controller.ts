import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  scopeDraftRequestSchema,
  type ScopeDraftRequest,
  type ScopeDraftResponse,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ScopeWriterService } from './scope-writer.service';

// Admin-only, but still a paid external API — cap accidental double-clicks/loops.
const SCOPE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@UseGuards(AdminGuard)
@Controller('admin/ai')
export class AdminAiController {
  constructor(private readonly writer: ScopeWriterService) {}

  @Post('scope')
  @HttpCode(200)
  @Throttle(SCOPE_THROTTLE)
  async draftScope(
    @Body(new ZodValidationPipe(scopeDraftRequestSchema)) body: ScopeDraftRequest,
  ): Promise<ScopeDraftResponse> {
    return { scope: await this.writer.draft(body) };
  }
}
