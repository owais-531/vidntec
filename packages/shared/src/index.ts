/**
 * @vidntec/shared — the FE/BE contract surface.
 *
 *   import { checkoutSchema, formatMoney, ACCESS_TOKEN_COOKIE } from '@vidntec/shared';
 *
 * Prisma model types + enums + the generated client come from the subpath:
 *
 *   import { PrismaClient, OrderStatus } from '@vidntec/shared/prisma';
 *
 * Password hashing (argon2, server-only) is deliberately NOT re-exported here
 * so it never gets pulled into a browser bundle. Import it explicitly:
 *
 *   import { hashPassword } from '@vidntec/shared/password';
 */
export * from './constants';
export * from './money';
export * from './datetime';
export * from './slug';
export * from './order-number';
export * from './http';
export * from './schemas';
