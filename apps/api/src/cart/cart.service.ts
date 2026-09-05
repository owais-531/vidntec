import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_CART_ITEM_QUANTITY, type CartLine, type CartView } from '@vidntec/shared';
import type { Cart, CartItem } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';

type GuestCartWithItems = Cart & { items: CartItem[] };

interface ResolvedCart {
  /** the cart to operate on (null = none and none created) */
  cartId: string | null;
  /** what the cart cookie should be set to (null = leave / no cart) */
  cookie: string | null;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Work out which cart this request should use.
   * - Guests: the cart named by the cookie, else a fresh one (when `create`).
   * - Authenticated: the user's own cart. If a guest-cart cookie is also
   *   present, its items are merged in and the guest cart is deleted.
   */
  async resolve(
    cookieCartId: string | undefined,
    userId: string | undefined,
    create: boolean,
  ): Promise<ResolvedCart> {
    return userId
      ? this.resolveForUser(cookieCartId, userId, create)
      : this.resolveForGuest(cookieCartId, create);
  }

  private async resolveForGuest(
    cookieCartId: string | undefined,
    create: boolean,
  ): Promise<ResolvedCart> {
    if (cookieCartId) {
      const cart = await this.prisma.cart.findFirst({
        where: { id: cookieCartId, userId: null },
        select: { id: true },
      });
      if (cart) return { cartId: cart.id, cookie: cart.id };
    }
    if (create) {
      const cart = await this.prisma.cart.create({ data: {}, select: { id: true } });
      return { cartId: cart.id, cookie: cart.id };
    }
    return { cartId: null, cookie: null };
  }

  private async resolveForUser(
    cookieCartId: string | undefined,
    userId: string,
    create: boolean,
  ): Promise<ResolvedCart> {
    let userCart = await this.prisma.cart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const guestCart =
      cookieCartId && cookieCartId !== userCart?.id
        ? await this.prisma.cart.findFirst({
            where: { id: cookieCartId, userId: null },
            include: { items: true },
          })
        : null;

    if (guestCart) {
      userCart = await this.mergeGuestIntoUser(guestCart, userCart?.id ?? null, userId);
    }

    if (!userCart && create) {
      userCart = await this.prisma.cart.create({ data: { userId }, select: { id: true } });
    }

    return { cartId: userCart?.id ?? null, cookie: userCart?.id ?? null };
  }

  private mergeGuestIntoUser(
    guestCart: GuestCartWithItems,
    userCartId: string | null,
    userId: string,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const targetId =
        userCartId ?? (await tx.cart.create({ data: { userId }, select: { id: true } })).id;

      const targetItems = await tx.cartItem.findMany({ where: { cartId: targetId } });
      const byVariant = new Map(targetItems.map((i) => [i.variantId, i]));

      for (const item of guestCart.items) {
        const existing = byVariant.get(item.variantId);
        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: {
              quantity: Math.min(existing.quantity + item.quantity, MAX_CART_ITEM_QUANTITY),
            },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: targetId,
              variantId: item.variantId,
              quantity: Math.min(item.quantity, MAX_CART_ITEM_QUANTITY),
            },
          });
        }
      }

      await tx.cart.delete({ where: { id: guestCart.id } });
      return { id: targetId };
    });
  }

  // ── operations ────────────────────────────────────────────────────────────

  async getView(cartId: string | null): Promise<CartView> {
    if (!cartId) return { id: null, lines: [], subtotal: 0, itemCount: 0, removedCount: 0 };

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: { include: { product: { include: { images: true } } } },
          },
        },
      },
    });
    if (!cart) return { id: null, lines: [], subtotal: 0, itemCount: 0, removedCount: 0 };

    const lines: CartLine[] = [];
    const deadItemIds: string[] = [];

    for (const item of cart.items) {
      const { variant } = item;
      if (variant.product.status !== 'active') {
        deadItemIds.push(item.id);
        continue;
      }
      const primary = [...variant.product.images].sort((a, b) => a.position - b.position)[0];
      lines.push({
        itemId: item.id,
        variantId: variant.id,
        productId: variant.productId,
        productSlug: variant.product.slug,
        productTitle: variant.product.title,
        variantName: variant.name,
        imageUrl: primary?.url ?? null,
        unitPrice: variant.price, // server-authoritative
        quantity: item.quantity,
        lineTotal: variant.price * item.quantity,
        availableStock: variant.stock,
        maxQuantity: Math.min(variant.stock, MAX_CART_ITEM_QUANTITY),
        exceedsStock: item.quantity > variant.stock,
      });
    }

    if (deadItemIds.length) {
      await this.prisma.cartItem.deleteMany({ where: { id: { in: deadItemIds } } });
    }

    lines.sort(
      (a, b) =>
        a.productTitle.localeCompare(b.productTitle) || a.variantName.localeCompare(b.variantName),
    );

    return {
      id: cart.id,
      lines,
      subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      removedCount: deadItemIds.length,
    };
  }

  async addItem(cartId: string, variantId: string, quantity: number): Promise<void> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: { product: { select: { status: true } } },
    });
    if (!variant || variant.product.status !== 'active') {
      throw new NotFoundException('That product is not available');
    }
    if (variant.stock <= 0) {
      throw new ConflictException('That option is out of stock');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
    });
    const target = Math.min(
      (existing?.quantity ?? 0) + quantity,
      variant.stock,
      MAX_CART_ITEM_QUANTITY,
    );

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity: target },
      update: { quantity: target },
    });
  }

  async setQuantity(cartId: string, variantId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId, variantId } });
      return;
    }
    const variant = await this.prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    const target = Math.min(quantity, variant.stock, MAX_CART_ITEM_QUANTITY);
    const updated = await this.prisma.cartItem.updateMany({
      where: { cartId, variantId },
      data: { quantity: target },
    });
    if (updated.count === 0) throw new NotFoundException('That item is not in your cart');
  }

  async removeItem(cartId: string, variantId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId, variantId } });
  }
}
