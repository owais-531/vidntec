import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ShippingRate as ShippingRateDto,
  ShippingRateInput,
  ShippingRateUpdate,
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

  async getActive(id: string): Promise<ShippingRate> {
    const rate = await this.prisma.shippingRate.findFirst({ where: { id, active: true } });
    if (!rate) throw new NotFoundException('Shipping option not available');
    return rate;
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
