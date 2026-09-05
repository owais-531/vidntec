import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ShippingService } from './shipping.service';

@SkipThrottle()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  /** Public — the checkout form needs the list of options. */
  @Get('rates')
  rates() {
    return this.shipping.listActive();
  }
}
