import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  customersExportQuerySchema,
  dashboardQuerySchema,
  ordersExportQuerySchema,
  type CustomersExportQuery,
  type DashboardQuery,
  type OrdersExportQuery,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ManagerGuard } from '../auth/guards/manager.guard';
import { ManagerService } from './manager.service';
import { formatStoreDateTime } from './dates';

const stamp = () => formatStoreDateTime(new Date()).slice(0, 10);

@UseGuards(ManagerGuard)
@Controller('manager')
export class ManagerController {
  constructor(private readonly manager: ManagerService) {}

  @Get('dashboard')
  dashboard(@Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery) {
    return this.manager.dashboard(query);
  }

  @Get('exports/orders')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async exportOrders(
    @Query(new ZodValidationPipe(ordersExportQuerySchema)) query: OrdersExportQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader('Content-Disposition', `attachment; filename="vidntec-${query.mode === 'items' ? 'order-items' : 'orders'}-${stamp()}.csv"`);
    return this.manager.exportOrders(query);
  }

  @Get('exports/customers')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async exportCustomers(
    @Query(new ZodValidationPipe(customersExportQuerySchema)) query: CustomersExportQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader('Content-Disposition', `attachment; filename="vidntec-customers-${stamp()}.csv"`);
    return this.manager.exportCustomers(query);
  }
}
