import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CategoriesService } from './categories.service';

/** Public, unauthenticated. Only categories with active products are listed. */
@SkipThrottle()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.listPublic();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.categories.getPublicBySlug(slug);
  }
}
