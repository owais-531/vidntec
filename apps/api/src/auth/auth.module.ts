import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AdminGuard } from './guards/admin.guard';
import { ManagerGuard } from './guards/manager.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    AccessTokenGuard,
    AdminGuard,
    ManagerGuard,
    OptionalAuthGuard,
  ],
  exports: [TokenService, AccessTokenGuard, AdminGuard, ManagerGuard, OptionalAuthGuard],
})
export class AuthModule {}
