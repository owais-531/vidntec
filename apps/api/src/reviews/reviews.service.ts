import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminReview,
  AdminReviewListQuery,
  MyReview,
  PublicReview,
  ReviewInput,
  ReviewListQuery,
  UploadSignatureResponse,
} from '@vidntec/shared';
import { Prisma } from '@vidntec/shared/prisma';
import type { Review, ReviewImage } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const REVIEW_UPLOAD_FOLDER = 'vidntec/reviews';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  signUpload(): UploadSignatureResponse {
    return this.cloudinary.signUpload(REVIEW_UPLOAD_FOLDER);
  }

  async listForProduct(productId: string, query: ReviewListQuery) {
    await this.ensureProductExists(productId);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId },
        include: { images: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return {
      items: rows.map(toPublicReview),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getMine(productId: string, userId: string): Promise<MyReview | null> {
    const review = await this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
      include: { images: true },
    });
    if (!review) return null;
    return {
      ...toPublicReview(review),
      images: [...review.images]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ url: i.url, publicId: i.publicId })),
    };
  }

  /** Create the customer's review, or replace it if one already exists for this product. */
  async upsertForProduct(
    productId: string,
    userId: string,
    input: ReviewInput,
  ): Promise<PublicReview> {
    await this.ensureProductExists(productId);

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
      include: { images: true },
    });

    const imageData = input.images.map((img, position: number) => ({
      url: img.url,
      publicId: img.publicId ?? null,
      position,
    }));

    const review = await this.prisma.review.upsert({
      where: { productId_userId: { productId, userId } },
      create: {
        productId,
        userId,
        authorName: input.authorName,
        rating: input.rating ?? null,
        comment: input.comment?.length ? input.comment : null,
        images: { create: imageData },
      },
      update: {
        authorName: input.authorName,
        rating: input.rating ?? null,
        comment: input.comment?.length ? input.comment : null,
        images: { deleteMany: {}, create: imageData },
      },
      include: { images: true },
    });

    // DB is the source of truth and is already updated — now best-effort clean
    // up the old Cloudinary assets this review no longer references.
    if (existing) {
      await Promise.all(
        existing.images
          .filter((i) => i.publicId)
          .map((i) => this.cloudinary.deleteAsset(i.publicId as string)),
      );
    }

    return toPublicReview(review);
  }

  // ── admin ─────────────────────────────────────────────────────────────────

  async adminList(query: AdminReviewListQuery) {
    const where: Prisma.ReviewWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          images: true,
          product: { select: { title: true } },
          user: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.review.count({ where }),
    ]);

    const items: AdminReview[] = rows.map((r) => ({
      ...toPublicReview(r),
      productId: r.productId,
      productTitle: r.product.title,
      userId: r.userId,
      userEmail: r.user.email,
    }));

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Admin: permanently delete any review (and its Cloudinary images). */
  async remove(id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.deleteReviewRow(review);
  }

  /** Customer: delete their own review for this product. 404s if they have none — the
   *  API never reveals *whose* review exists, so this can't be used to probe authorship. */
  async removeMine(productId: string, userId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
      include: { images: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.deleteReviewRow(review);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async deleteReviewRow(review: Review & { images: ReviewImage[] }): Promise<void> {
    await this.prisma.review.delete({ where: { id: review.id } });
    await Promise.all(
      review.images
        .filter((i) => i.publicId)
        .map((i) => this.cloudinary.deleteAsset(i.publicId as string)),
    );
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const count = await this.prisma.product.count({ where: { id: productId } });
    if (!count) throw new NotFoundException('Product not found');
  }
}

function toPublicReview(r: Review & { images: ReviewImage[] }): PublicReview {
  return {
    id: r.id,
    authorName: r.authorName,
    rating: r.rating,
    comment: r.comment,
    images: [...r.images].sort((a, b) => a.position - b.position).map((i) => ({ url: i.url })),
    createdAt: r.createdAt.toISOString(),
  };
}
