import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LOW_STOCK_THRESHOLD,
  slugify,
  type AdminProduct,
  type AdminProductListQuery,
  type AdminVariant,
  type AttachImageInput,
  type CreateProductInput,
  type InventoryItem,
  type ProductImageDto,
  type StockAdjustmentInput,
  type UpdateProductInput,
  type UploadSignatureResponse,
  type VariantInput,
  type VariantUpdate,
} from '@vidntec/shared';
import { Prisma } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  toAdminProduct,
  toAdminVariant,
  toImageDto,
  toListItem,
} from './products.mapper';
import { sanitizeDescription } from './sanitize-description';

const WITH_RELATIONS = { images: true, variants: true } as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ── products ──────────────────────────────────────────────────────────────

  async list(query: AdminProductListQuery) {
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: WITH_RELATIONS,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(id: string): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: WITH_RELATIONS,
    });
    if (!product) throw new NotFoundException('Product not found');
    return toAdminProduct(product);
  }

  async create(input: CreateProductInput): Promise<AdminProduct> {
    const slug = await this.uniqueSlug(input.slug ?? slugify(input.title));
    this.assertUniqueSkus(input.variants.map((v) => v.sku));

    try {
      const product = await this.prisma.product.create({
        data: {
          title: input.title,
          slug,
          description: sanitizeDescription(input.description),
          status: input.status,
          featured: input.featured ?? false,
          variants: { create: input.variants },
        },
        include: WITH_RELATIONS,
      });
      return toAdminProduct(product);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async update(id: string, input: UpdateProductInput): Promise<AdminProduct> {
    await this.ensureExists(id);
    const data: Prisma.ProductUpdateInput = { ...input };
    if (input.slug) data.slug = await this.uniqueSlug(input.slug, id);
    if (data.description !== undefined) {
      data.description = sanitizeDescription(data.description as string);
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data,
        include: WITH_RELATIONS,
      });
      return toAdminProduct(product);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await Promise.all(
      product.images
        .filter((img) => img.publicId)
        .map((img) => this.cloudinary.deleteAsset(img.publicId!)),
    );
    // Variants + images cascade. OrderItem.variantId is set null (snapshots remain).
    await this.prisma.product.delete({ where: { id } });
  }

  // ── variants ──────────────────────────────────────────────────────────────

  async addVariant(productId: string, input: VariantInput): Promise<AdminVariant> {
    await this.ensureExists(productId);
    try {
      const variant = await this.prisma.variant.create({
        data: { ...input, productId },
      });
      return toAdminVariant(variant);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async updateVariant(id: string, input: VariantUpdate): Promise<AdminVariant> {
    await this.ensureVariantExists(id);
    try {
      const variant = await this.prisma.variant.update({ where: { id }, data: input });
      return toAdminVariant(variant);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async removeVariant(id: string): Promise<void> {
    const variant = await this.prisma.variant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');

    const siblings = await this.prisma.variant.count({ where: { productId: variant.productId } });
    if (siblings <= 1) {
      throw new BadRequestException('A product must keep at least one variant');
    }
    await this.prisma.variant.delete({ where: { id } });
  }

  async adjustStock(id: string, input: StockAdjustmentInput): Promise<AdminVariant> {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.variant.findUnique({ where: { id } });
      if (!variant) throw new NotFoundException('Variant not found');

      const nextStock =
        input.mode === 'set' ? input.value : variant.stock + input.value;
      if (nextStock < 0) {
        throw new BadRequestException('Stock cannot go negative');
      }
      const updated = await tx.variant.update({
        where: { id },
        data: { stock: nextStock },
      });
      return toAdminVariant(updated);
    });
  }

  async inventory(search?: string): Promise<InventoryItem[]> {
    const q = search?.trim();
    const variants = await this.prisma.variant.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { product: { title: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: { product: { select: { title: true } } },
      orderBy: [{ stock: 'asc' }, { product: { title: 'asc' } }],
    });
    return variants.map((v) => ({
      variantId: v.id,
      productId: v.productId,
      productTitle: v.product.title,
      variantName: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      lowStock: v.stock <= LOW_STOCK_THRESHOLD,
    }));
  }

  // ── images ────────────────────────────────────────────────────────────────

  signUpload(folder: string): UploadSignatureResponse {
    return this.cloudinary.signUpload(folder);
  }

  async attachImage(productId: string, input: AttachImageInput): Promise<ProductImageDto> {
    await this.ensureExists(productId);
    const last = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: 'desc' },
    });
    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: input.url,
        publicId: input.publicId,
        position: (last?.position ?? -1) + 1,
      },
    });
    return toImageDto(image);
  }

  async reorderImages(productId: string, imageIds: string[]): Promise<ProductImageDto[]> {
    const images = await this.prisma.productImage.findMany({ where: { productId } });
    const owned = new Set(images.map((i) => i.id));
    if (imageIds.length !== images.length || !imageIds.every((id) => owned.has(id))) {
      throw new BadRequestException('imageIds must list every image of this product exactly once');
    }
    await this.prisma.$transaction(
      imageIds.map((id, position) =>
        this.prisma.productImage.update({ where: { id }, data: { position } }),
      ),
    );
    const fresh = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
    return fresh.map(toImageDto);
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');
    if (image.publicId) await this.cloudinary.deleteAsset(image.publicId);
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.product.count({ where: { id } });
    if (!count) throw new NotFoundException('Product not found');
  }

  private async ensureVariantExists(id: string): Promise<void> {
    const count = await this.prisma.variant.count({ where: { id } });
    if (!count) throw new NotFoundException('Variant not found');
  }

  private assertUniqueSkus(skus: string[]): void {
    if (new Set(skus).size !== skus.length) {
      throw new BadRequestException('Variant SKUs must be unique within a product');
    }
  }

  /** Append -2, -3… until the slug is free (optionally ignoring one product id). */
  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const clean = slugify(base) || 'product';
    let candidate = clean;
    let n = 1;
    for (;;) {
      const clash = await this.prisma.product.findFirst({
        where: { slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${clean}-${n}`;
    }
  }

  private mapWriteError(err: unknown): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return new ConflictException(`A record with that ${target} already exists`);
    }
    return err instanceof Error ? err : new Error('Write failed');
  }
}
