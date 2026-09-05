import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv, type Env } from './env';

/**
 * Typed config access: inject `ConfigService<Env, true>` and call
 * `config.get('JWT_ACCESS_SECRET', { infer: true })`.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      // Locally: apps/api/.env overrides the shared repo-root .env (used by the
      // Prisma CLI too). On Railway every var comes from the host environment.
      envFilePath: ['.env', '../../.env'],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

export type TypedConfigService = ConfigService<Env, true>;
