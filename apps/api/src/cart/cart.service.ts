import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MAX_CART_ITEM_QUANTITY,
  personalizationKey,
  resolvePersonalization,
  type CartLine,
  type CartView,
  type PersonalizationField,
  type PersonalizationInput,
  type PersonalizationSelection,
} from '@vidntec/shared';
import type { Cart, CartItem, Prisma } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { toPersonalizationFields, toSelections } from '../products/products.mapper';

type GuestCartWithItems = Cart & { items: CartItem[] };

interface ResolvedCart {
  /** the cart to operate on (null = none and none created) */
  cartId: string | null;
  /** what the cart cookie should be set to (null = leave / no cart) */
  cookie: string | null;
}

/** Key for "same variant + same personalization" — what merges two cart lines into one. */
function mergeKey(item: { variantId: string; customizationKey: string }): string {
  return `${item.variantId}::${item.customizationKey}`;
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
      const byKey = new Map(targetItems.map((i) => [mergeKey(i), i]));

      for (const item of guestCart.items) {
        const existing = byKey.get(mergeKey(item));
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
              personalization: item.personalization ?? [],
              customizationKey: item.customizationKey,
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
        personalization: toSelections(item.personalization),
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
    answers: PersonalizationInput = {},
  ): Promise<void> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: { status: true, personalizationFields: true },
        },
      },
    });
    if (!variant || variant.product.status !== 'active') {
      throw new NotFoundException('That product is not available');
    }
    if (variant.stock <= 0) {
      throw new ConflictException('That option is out of stock');
    }

    const selections = this.resolveAnswers(
      toPersonalizationFields(variant.product.personalizationFields),
      answers,
    );
    const customizationKey = personalizationKey(selections);

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        variantId,
        customizationKey,
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
        data: {
          cartId,
          variantId,
          quantity: target,
          personalization: selections as unknown as Prisma.InputJsonValue,
          customizationKey,
        },
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
   * Validates the customer's answers against the product's own fields (required,
   * max length, valid dropdown choice). A dropdown's hex always comes from the
   * product's own choices, never from the client.
   */
  private resolveAnswers(
    fields: PersonalizationField[],
    answers: PersonalizationInput,
  ): PersonalizationSelection[] {
    const { selections, errors } = resolvePersonalization(fields, answers);
    const first = Object.values(errors)[0];
    if (first) throw new BadRequestException(first);
    return selections;
  }
}
