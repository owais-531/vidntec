import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  slugify,
  type AdminCategory,
  type CategoryInput,
  type CategoryUpdate,
  type PublicCategory,
} from '@vidntec/shared';
import { Prisma } from '@vidntec/shared/prisma';
import type { Category } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';

/** `_count` filter: only active products count toward a category's storefront total. */
const ACTIVE_PRODUCT_COUNT = {
  _count: { select: { products: { where: { status: 'active' as const } } } },
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── admin ─────────────────────────────────────────────────────────────────

  async listAdmin(): Promise<AdminCategory[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return rows.map((c) => toAdminDto(c, c._count.products));
  }

  async create(input: CategoryInput): Promise<AdminCategory> {
    const slug = await this.uniqueSlug(input.slug ?? slugify(input.name));
    const last = await this.prisma.category.findFirst({ orderBy: { position: 'desc' } });
    try {
      const category = await this.prisma.category.create({
        data: {
          name: input.name,
          slug,
          color: input.color,
          emoji: input.emoji ?? null,
          position: (last?.position ?? -1) + 1,
        },
      });
      return toAdminDto(category, 0);
    } catch (err) {
      throw mapWriteError(err);
    }
  }

  async update(id: string, input: CategoryUpdate): Promise<AdminCategory> {
    await this.ensureExists(id);
    const data: Prisma.CategoryUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.color !== undefined) data.color = input.color;
    if (input.emoji !== undefined) data.emoji = input.emoji ?? null;
    if (input.slug !== undefined) data.slug = await this.uniqueSlug(input.slug, id);

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data,
        include: { _count: { select: { products: true } } },
      });
      return toAdminDto(category, category._count.products);
    } catch (err) {
      throw mapWriteError(err);
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    // Product.categoryId FK is ON DELETE SET NULL — assigned products survive,
    // they just become uncategorised.
    await this.prisma.category.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<AdminCategory[]> {
    const all = await this.prisma.category.findMany({ select: { id: true } });
    const owned = new Set(all.map((c) => c.id));
    if (ids.length !== all.length || !ids.every((id) => owned.has(id))) {
      throw new BadRequestException('ids must list every category exactly once');
    }
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.category.update({ where: { id }, data: { position } }),
      ),
    );
    return this.listAdmin();
  }

  // ── public storefront ─────────────────────────────────────────────────────

  /** Categories that currently have at least one active product, in display order. */
  async listPublic(): Promise<PublicCategory[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: ACTIVE_PRODUCT_COUNT,
    });
    return rows
      .map((c) => toPublicDto(c, c._count.products))
      .filter((c) => c.productCount > 0);
  }

  async getPublicBySlug(slug: string): Promise<PublicCategory> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: ACTIVE_PRODUCT_COUNT,
    });
    if (!category) throw new NotFoundException('Category not found');
    return toPublicDto(category, category._count.products);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.category.count({ where: { id } });
    if (!count) throw new NotFoundException('Category not found');
  }

  /** Append -2, -3… until the slug is free (optionally ignoring one category id). */
  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const clean = slugify(base) || 'category';
    let candidate = clean;
    let n = 1;
    for (;;) {
      const clash = await this.prisma.category.findFirst({
        where: { slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${clean}-${n}`;
    }
  }
}

function toAdminDto(c: Category, productCount: number): AdminCategory {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    color: c.color,
    emoji: c.emoji,
    position: c.position,
    productCount,
  };
}

function toPublicDto(c: Category, productCount: number): PublicCategory {
  return { name: c.name, slug: c.slug, color: c.color, emoji: c.emoji, productCount };
}

function mapWriteError(err: unknown): Error {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return new ConflictException('A category with that name already exists');
  }
  return err instanceof Error ? err : new Error('Write failed');
}
