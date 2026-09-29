import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { CategoriesModule } from '../categories/categories.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrdersModule } from '../orders/orders.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AdminAiController } from './admin-ai.controller';
import { ScopeWriterService } from './scope-writer.service';

// SettingsService isn't imported here — SettingsModule is @Global(), same
// convention every other feature module already follows.
@Module({
  imports: [AuthModule, StorefrontModule, CategoriesModule, ShippingModule, OrdersModule],
  controllers: [ChatController, AdminAiController],
  providers: [ChatService, ScopeWriterService],
})
export class ChatModule {}
