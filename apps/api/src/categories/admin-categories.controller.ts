import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  categoryInputSchema,
  categoryUpdateSchema,
  reorderCategoriesSchema,
  type CategoryInput,
  type CategoryUpdate,
  type ReorderCategoriesInput,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CategoriesService } from './categories.service';

@UseGuards(AdminGuard)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.listAdmin();
  }

  @Post()
  create(@Body(new ZodValidationPipe(categoryInputSchema)) body: CategoryInput) {
    return this.categories.create(body);
  }

  // Declared before `:id` so the literal path wins the match.
  @Patch('reorder')
  reorder(
    @Body(new ZodValidationPipe(reorderCategoriesSchema)) body: ReorderCategoriesInput,
  ) {
    return this.categories.reorder(body.ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(categoryUpdateSchema)) body: CategoryUpdate,
  ) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.categories.remove(id);
  }
}
