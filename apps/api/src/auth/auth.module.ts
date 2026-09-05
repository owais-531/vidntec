import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AdminGuard } from './guards/admin.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    AccessTokenGuard,
    AdminGuard,
    OptionalAuthGuard,
  ],
  exports: [TokenService, AccessTokenGuard, AdminGuard, OptionalAuthGuard],
})
export class AuthModule {}
