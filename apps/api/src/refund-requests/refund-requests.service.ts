import { Injectable, NotFoundException } from '@nestjs/common';
import type { RefundRequestInput, UploadSignatureResponse } from '@vidntec/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';

const REFUND_REQUEST_UPLOAD_FOLDER = 'vidntec/refund-requests';

@Injectable()
export class RefundRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly mail: MailService,
  ) {}

  signUpload(): UploadSignatureResponse {
    return this.cloudinary.signUpload(REFUND_REQUEST_UPLOAD_FOLDER);
  }

  /** Email-only — no DB record. We still verify the order + email actually
   *  match (guest or signed-in, unlike the guest-only order-lookup) so this
   *  can't be used to spam arbitrary "order numbers" at support. */
  async submit(input: RefundRequestInput): Promise<void> {
    const ref = input.orderReference.toLowerCase();
    const order = await this.prisma.order.findFirst({
      where: {
        email: { equals: input.email, mode: 'insensitive' },
        OR: [
          { id: { endsWith: ref } },
          { trackingNumber: { equals: input.orderReference, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.mail.sendRefundRequestNotification({
      name: input.name,
      email: input.email,
      phone: input.phone,
      orderReference: input.orderReference,
      orderId: order.id,
      reason: input.reason,
      details: input.details,
      photos: input.photos,
    });
  }
}
