import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { refundRequestSchema, type RefundRequestInput, type UploadSignatureResponse } from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RefundRequestsService } from './refund-requests.service';

/** Public + unauthenticated (guest checkout is the common case) — spam-prone,
 *  same tight throttle as other public customer writes. */
const WRITE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('refund-requests')
export class RefundRequestsController {
  constructor(private readonly refundRequests: RefundRequestsService) {}

  @Post('uploads/signature')
  @Throttle(WRITE_THROTTLE)
  signUpload(): UploadSignatureResponse {
    return this.refundRequests.signUpload();
  }

  @Post()
  @HttpCode(200)
  @Throttle(WRITE_THROTTLE)
  submit(@Body(new ZodValidationPipe(refundRequestSchema)) body: RefundRequestInput) {
    return this.refundRequests.submit(body);
  }
}
