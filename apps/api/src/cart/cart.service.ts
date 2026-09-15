import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_CART_ITEM_QUANTITY, type CartLine, type CartView } from '@vidntec/shared';
import type { Cart, CartItem, Prisma } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { toColorOptions } from '../products/products.mapper';

type GuestCartWithItems = Cart & { items: CartItem[] };

interface ResolvedCart {
  /** the cart to operate on (null = none and none created) */
  cartId: string | null;
  /** what the cart cookie should be set to (null = leave / no cart) */
  cookie: string | null;
}

/** The customer-supplied side of personalization, before server-side resolution. */
export interface PersonalizationInput {
  customName?: string;
  customColorLabel?: string;
}

/** The stored/snapshot shape once resolved against the product's own config. */
interface ResolvedPersonalization {
  customName: string | null;
  customColorLabel: string | null;
  customColorHex: string | null;
}

/** Distinguishes cart lines for the same variant that differ only by personalization. */
function personalizationKey(item: ResolvedPersonalization & { variantId: string }): string {
  return `${item.variantId}::${item.customName ?? ''}::${item.customColorLabel ?? ''}::${item.customColorHex ?? ''}`;
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
      const byKey = new Map(targetItems.map((i) => [personalizationKey(i), i]));

      for (const item of guestCart.items) {
        const existing = byKey.get(personalizationKey(item));
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
              customName: item.customName,
              customColorLabel: item.customColorLabel,
              customColorHex: item.customColorHex,
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
        customName: item.customName,
        customColorLabel: item.customColorLabel,
        customColorHex: item.customColorHex,
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

  async addItem(
    cartId: string,
    variantId: string,
    quantity: number,
    personalization: PersonalizationInput = {},
  ): Promise<void> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            status: true,
            customizationNameEnabled: true,
            customizationColorEnabled: true,
            customizationColorOptions: true,
          },
        },
      },
    });
    if (!variant || variant.product.status !== 'active') {
      throw new NotFoundException('That product is not available');
    }
    if (variant.stock <= 0) {
      throw new ConflictException('That option is out of stock');
    }

    const resolved = this.resolvePersonalization(variant.product, personalization);

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        variantId,
        customName: resolved.customName,
        customColorLabel: resolved.customColorLabel,
        customColorHex: resolved.customColorHex,
      },
    });
    const target = Math.min(
      (existing?.quantity ?? 0) + quantity,
      variant.stock,
      MAX_CART_ITEM_QUANTITY,
    );

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: target },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId, variantId, quantity: target, ...resolved },
      });
    }
  }

  async setQuantity(cartId: string, itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
      return;
    }
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { variant: true },
    });
    if (!item) throw new NotFoundException('That item is not in your cart');

    const target = Math.min(quantity, item.variant.stock, MAX_CART_ITEM_QUANTITY);
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: target } });
  }

  async removeItem(cartId: string, itemId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /**
   * Validates the customer's personalization choice against the product's own
   * config and resolves it to what actually gets stored. Required fields that
   * are missing/invalid throw — a customer can't skip personalization on a
   * product that has it enabled. The color's hex always comes from the
   * product's own options, never from the client.
   */
  private resolvePersonalization(
    product: {
      customizationNameEnabled: boolean;
      customizationColorEnabled: boolean;
      customizationColorOptions: Prisma.JsonValue;
    },
    input: PersonalizationInput,
  ): ResolvedPersonalization {
    let customName: string | null = null;
    if (product.customizationNameEnabled) {
      const trimmed = input.customName?.trim();
      if (!trimmed) {
        throw new BadRequestException('Please enter a name for this product');
      }
      customName = trimmed;
    }

    let customColorLabel: string | null = null;
    let customColorHex: string | null = null;
    if (product.customizationColorEnabled) {
      const options = toColorOptions(product.customizationColorOptions);
      const match = options.find((o) => o.label === input.customColorLabel);
      if (!match) {
        throw new BadRequestException('Please choose a color for this product');
      }
      customColorLabel = match.label;
      customColorHex = match.hex;
    }

    return { customName, customColorLabel, customColorHex };
  }
}
