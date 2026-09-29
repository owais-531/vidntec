import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ManagerOrdersController } from './manager-orders.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController, ManagerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
