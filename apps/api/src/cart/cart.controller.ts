import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  CART_COOKIE,
  addCartItemSchema,
  updateCartItemSchema,
  type AddCartItemInput,
  type CartView,
  type UpdateCartItemInput,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { Env } from '../config/env';
import { CartService } from './cart.service';
import { setCartCookie } from './cart.cookie';

@SkipThrottle()
@UseGuards(OptionalAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  async get(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CartView> {
    return this.load(req, res, user, false);
  }

  /** Called by the web right after login to fold a guest cart into the user's. */
  @Post('merge')
  @HttpCode(200)
  async merge(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CartView> {
    return this.load(req, res, user, true);
  }

  @Post('items')
  async add(
    @Body(new ZodValidationPipe(addCartItemSchema)) body: AddCartItemInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CartView> {
    const cartId = await this.resolveWithCookie(req, res, user, true);
    await this.cart.addItem(cartId!, body.variantId, body.quantity);
    return this.cart.getView(cartId);
  }

  @Patch('items/:variantId')
  async update(
    @Param('variantId') variantId: string,
    @Body(new ZodValidationPipe(updateCartItemSchema)) body: UpdateCartItemInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CartView> {
    const cartId = await this.resolveWithCookie(req, res, user, true);
    await this.cart.setQuantity(cartId!, variantId, body.quantity);
    return this.cart.getView(cartId);
  }

  @Delete('items/:variantId')
  async remove(
    @Param('variantId') variantId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CartView> {
    const cartId = await this.resolveWithCookie(req, res, user, false);
    if (cartId) await this.cart.removeItem(cartId, variantId);
    return this.cart.getView(cartId);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async load(
    req: Request,
    res: Response,
    user: AuthenticatedUser | undefined,
    create: boolean,
  ): Promise<CartView> {
    const cartId = await this.resolveWithCookie(req, res, user, create);
    return this.cart.getView(cartId);
  }

  private async resolveWithCookie(
    req: Request,
    res: Response,
    user: AuthenticatedUser | undefined,
    create: boolean,
  ): Promise<string | null> {
    const cookieCartId = req.cookies?.[CART_COOKIE] as string | undefined;
    const { cartId, cookie } = await this.cart.resolve(cookieCartId, user?.id, create);
    if (cookie && cookie !== cookieCartId) {
      setCartCookie(res, this.config, cookie);
    }
    return cartId;
  }
}
