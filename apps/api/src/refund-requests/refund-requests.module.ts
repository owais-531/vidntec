import { Module } from '@nestjs/common';
import { RefundRequestsService } from './refund-requests.service';
import { RefundRequestsController } from './refund-requests.controller';

@Module({
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService],
})
export class RefundRequestsModule {}
