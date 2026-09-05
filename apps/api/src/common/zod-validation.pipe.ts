import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Wraps a Zod schema as a NestJS pipe:
 *
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductInput) {}
 *
 * On failure it throws a 400 with a flattened `fieldErrors` map that the web
 * client understands (see `apiErrorSchema` in @vidntec/shared).
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const flat = err.flatten();
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          fieldErrors: flat.fieldErrors,
          formErrors: flat.formErrors,
        });
      }
      throw err;
    }
  }
}
