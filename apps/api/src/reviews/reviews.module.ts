import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ManagerReviewsController } from './manager-reviews.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController, ManagerReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
