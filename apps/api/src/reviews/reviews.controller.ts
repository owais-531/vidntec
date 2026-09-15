import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  reviewInputSchema,
  reviewListQuerySchema,
  type MyReview,
  type PublicReview,
  type ReviewInput,
  type ReviewListQuery,
  type UploadSignatureResponse,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ReviewsService } from './reviews.service';

/** Spam-prone customer writes get a tighter throttle than the global default. */
const WRITE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('products/:id/reviews')
  @SkipThrottle()
  list(
    @Param('id') productId: string,
    @Query(new ZodValidationPipe(reviewListQuerySchema)) query: ReviewListQuery,
  ) {
    return this.reviews.listForProduct(productId, query);
  }

  @Get('products/:id/reviews/mine')
  @UseGuards(AccessTokenGuard)
  mine(
    @Param('id') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyReview | null> {
    return this.reviews.getMine(productId, user.id);
  }

  @Post('products/:id/reviews')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Throttle(WRITE_THROTTLE)
  submit(
    @Param('id') productId: string,
    @Body(new ZodValidationPipe(reviewInputSchema)) body: ReviewInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PublicReview> {
    return this.reviews.upsertForProduct(productId, user.id, body);
  }

  /** The author deletes their own review. Anyone else's review 404s — never a 403 that
   *  would reveal a review exists for this account on this product. */
  @Delete('products/:id/reviews/mine')
  @HttpCode(204)
  @UseGuards(AccessTokenGuard)
  removeMine(
    @Param('id') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.reviews.removeMine(productId, user.id);
  }

  @Post('reviews/uploads/signature')
  @UseGuards(AccessTokenGuard)
  @Throttle(WRITE_THROTTLE)
  signUpload(): UploadSignatureResponse {
    return this.reviews.signUpload();
  }
}
