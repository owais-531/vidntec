import { Module } from '@nestjs/common';
import { StorefrontModule } from '../storefront/storefront.module';
import { CategoriesModule } from '../categories/categories.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrdersModule } from '../orders/orders.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

// SettingsService isn't imported here — SettingsModule is @Global(), same
// convention every other feature module already follows.
@Module({
  imports: [StorefrontModule, CategoriesModule, ShippingModule, OrdersModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
