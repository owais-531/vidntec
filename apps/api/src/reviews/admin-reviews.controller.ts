import { Controller, Delete, Get, HttpCode, Param, Query, UseGuards } from '@nestjs/common';
import { adminReviewListQuerySchema, type AdminReviewListQuery } from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReviewsService } from './reviews.service';

@UseGuards(AdminGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminReviewListQuerySchema)) query: AdminReviewListQuery,
  ) {
    return this.reviews.adminList(query);
  }

  /** Permanently delete a review (live moderation — any review, any reason). */
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}
