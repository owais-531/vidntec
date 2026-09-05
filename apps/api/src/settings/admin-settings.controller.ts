import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { storeSettingsInputSchema, type StoreSettingsInput } from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SettingsService } from './settings.service';

@UseGuards(AdminGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.getDto();
  }

  @Patch()
  update(
    @Body(new ZodValidationPipe(storeSettingsInputSchema)) body: StoreSettingsInput,
  ) {
    return this.settings.update(body);
  }
}
