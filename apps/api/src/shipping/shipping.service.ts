import { Injectable, NotFoundException } from '@nestjs/common';
import {
  isFreeDeliveryCity,
  type ShippingRate as ShippingRateDto,
  type ShippingRateInput,
  type ShippingRateUpdate,
} from '@vidntec/shared';
import type { ShippingRate } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<ShippingRateDto[]> {
    const rates = await this.prisma.shippingRate.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    return rates.map(toDto);
  }

  async listAll(): Promise<ShippingRateDto[]> {
    const rates = await this.prisma.shippingRate.findMany({
      orderBy: [{ active: 'desc' }, { price: 'asc' }],
    });
    return rates.map(toDto);
  }

  /**
   * The single flat rate actually charged at checkout — customers no longer pick a
   * method. Free override for Rawalpindi/Islamabad; otherwise the cheapest active
   * rate (still respecting its own `minOrderForFree` threshold, if set).
   */
  async resolveForAddress(
    city: string,
    subtotalCents: number,
  ): Promise<{ amount: number; rateName: string }> {
    const rates = await this.listActive();
    if (rates.length === 0) throw new NotFoundException('No shipping rate configured');
    const rate = rates[0]!;
    const amount = isFreeDeliveryCity(city) ? 0 : this.amountFor(rate, subtotalCents);
    return { amount, rateName: rate.name };
  }

  async create(input: ShippingRateInput): Promise<ShippingRateDto> {
    const rate = await this.prisma.shippingRate.create({
      data: {
        name: input.name,
        price: input.price,
        minOrderForFree: input.minOrderForFree ?? null,
        active: input.active,
      },
    });
    return toDto(rate);
  }

  async update(id: string, input: ShippingRateUpdate): Promise<ShippingRateDto> {
    await this.ensureExists(id);
    const rate = await this.prisma.shippingRate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.minOrderForFree !== undefined
          ? { minOrderForFree: input.minOrderForFree ?? null }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    return toDto(rate);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    // Orders don't reference the rate id, so a hard delete is safe.
    await this.prisma.shippingRate.delete({ where: { id } });
  }

  /** The charged shipping amount for a given subtotal (respects the free threshold). */
  amountFor(rate: Pick<ShippingRate, 'price' | 'minOrderForFree'>, subtotalCents: number): number {
    if (rate.minOrderForFree !== null && subtotalCents >= rate.minOrderForFree) return 0;
    return rate.price;
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.shippingRate.count({ where: { id } });
    if (!count) throw new NotFoundException('Shipping rate not found');
  }
}

function toDto(r: ShippingRate): ShippingRateDto {
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    minOrderForFree: r.minOrderForFree,
    active: r.active,
  };
}
