import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PREVIEW_MAX_REFERENCES,
  type AdminPreviewReference,
  type AttachPreviewReferenceInput,
  type UpdatePreviewReferenceInput,
} from '@vidntec/shared';
import type { PreviewReference } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

export function toAdminPreviewReference(r: PreviewReference): AdminPreviewReference {
  return { id: r.id, url: r.url, letters: r.letters, position: r.position };
}

/** Admin-managed reference photos the AI preview is built from (one per initial, plus a default). */
@Injectable()
export class PreviewReferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async attach(productId: string, input: AttachPreviewReferenceInput): Promise<AdminPreviewReference> {
    await this.ensureProduct(productId);
    const existing = await this.prisma.previewReference.findMany({
      where: { productId },
      select: { position: true },
    });
    if (existing.length >= PREVIEW_MAX_REFERENCES) {
      throw new BadRequestException(`A product can have at most ${PREVIEW_MAX_REFERENCES} reference photos`);
    }
    const position = existing.reduce((max, r) => Math.max(max, r.position), -1) + 1;
    const row = await this.prisma.previewReference.create({
      data: { productId, url: input.url, publicId: input.publicId, letters: input.letters, position },
    });
    return toAdminPreviewReference(row);
  }

  async setLetters(
    productId: string,
    referenceId: string,
    input: UpdatePreviewReferenceInput,
  ): Promise<AdminPreviewReference> {
    await this.ensureReference(productId, referenceId);
    const row = await this.prisma.previewReference.update({
      where: { id: referenceId },
      data: { letters: input.letters },
    });
    return toAdminPreviewReference(row);
  }

  async remove(productId: string, referenceId: string): Promise<void> {
    const ref = await this.ensureReference(productId, referenceId);
    if (ref.publicId) await this.cloudinary.deleteAsset(ref.publicId, 'image');
    await this.prisma.previewReference.delete({ where: { id: referenceId } });
  }

  private async ensureProduct(productId: string): Promise<void> {
    const count = await this.prisma.product.count({ where: { id: productId } });
    if (!count) throw new NotFoundException('Product not found');
  }

  private async ensureReference(productId: string, referenceId: string): Promise<PreviewReference> {
    const ref = await this.prisma.previewReference.findFirst({ where: { id: referenceId, productId } });
    if (!ref) throw new NotFoundException('Reference photo not found');
    return ref;
  }
}
