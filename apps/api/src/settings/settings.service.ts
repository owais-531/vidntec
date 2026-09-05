import { Injectable } from '@nestjs/common';
import type { StoreSettings as StoreSettingsDto, StoreSettingsInput } from '@vidntec/shared';
import type { StoreSettings } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';

/** Single-row store configuration. */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get(): Promise<StoreSettings> {
    return this.prisma.storeSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async getDto(): Promise<StoreSettingsDto> {
    return toDto(await this.get());
  }

  async update(input: StoreSettingsInput): Promise<StoreSettingsDto> {
    await this.get(); // ensure the row exists
    const updated = await this.prisma.storeSettings.update({
      where: { id: 1 },
      data: input,
    });
    return toDto(updated);
  }
}

function toDto(s: StoreSettings): StoreSettingsDto {
  return {
    taxEnabled: s.taxEnabled,
    taxRateBps: s.taxRateBps,
    taxLabel: s.taxLabel,
    currency: s.currency,
    storeName: s.storeName,
    supportEmail: s.supportEmail,
  };
}
