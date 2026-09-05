import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  storefrontListQuerySchema,
  type StorefrontListQuery,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorefrontService } from './storefront.service';

/** Public, unauthenticated catalog. Only `status: 'active'` products are exposed. */
@SkipThrottle()
@Controller('products')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(storefrontListQuerySchema)) query: StorefrontListQuery,
  ) {
    return this.storefront.list(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.storefront.getBySlug(slug);
  }
}
