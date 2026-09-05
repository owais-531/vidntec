import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_OTP_MAX_ATTEMPTS } from '@vidntec/shared';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';

type AnyMock = ReturnType<typeof vi.fn>;

function makePrismaMock() {
  return {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    emailOtp: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      // interactive transaction — hand back a tx that reuses the same mocks
      return fn(prismaMockRef);
    }),
  };
}

let prismaMockRef: ReturnType<typeof makePrismaMock>;

function makeService() {
  const prisma = makePrismaMock();
  prismaMockRef = prisma;
  const config = {
    getOrThrow: () => 'test-secret-test-secret-test-secret-xx',
    get: () => 'http://localhost:3000',
  } as unknown as ConfigService;
  const tokens = new TokenService(config as never);
  const mail = {
    sendPasswordReset: vi.fn(),
    sendVerificationOtp: vi.fn(),
  } as unknown as MailService;
  const service = new AuthService(prisma as never, tokens, mail, config as never);
  return { service, prisma, tokens, mail };
}

const dbUser = {
  id: 'u1',
  email: 'new@example.com',
  passwordHash: 'irrelevant',
  role: 'customer' as const,
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
};

const unverifiedUser = { ...dbUser, emailVerifiedAt: null };

describe('AuthService.signup', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('creates every signup as role=customer and emails an OTP instead of logging in', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(null);
    ctx.prisma.user.create.mockResolvedValue(unverifiedUser);
    ctx.prisma.emailOtp.create.mockResolvedValue({ id: 'otp1' });

    await ctx.service.signup({ email: 'new@example.com', password: 'longenoughpw' });

    const createArg = (ctx.prisma.user.create as AnyMock).mock.calls[0][0];
    expect(createArg.data.role).toBe('customer');
    expect(ctx.prisma.emailOtp.create).toHaveBeenCalledTimes(1);
    expect(ctx.mail.sendVerificationOtp).toHaveBeenCalledWith(
      'new@example.com',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('rejects a duplicate email', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(dbUser);
    await expect(
      ctx.service.signup({ email: 'new@example.com', password: 'longenoughpw' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService.login (verification gate)', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('rejects an unverified account even with the correct password', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue({
      ...unverifiedUser,
      passwordHash: await (await import('@vidntec/shared/password')).hashPassword('correct-password'),
    });

    await expect(
      ctx.service.login({ email: unverifiedUser.email, password: 'correct-password' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AuthService.verifySignupOtp', () => {
  let ctx: ReturnType<typeof makeService>;
  const otpRecord = {
    id: 'otp1',
    userId: 'u1',
    codeHash: '',
    attempts: 0,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };

  beforeEach(() => {
    ctx = makeService();
    otpRecord.codeHash = ctx.tokens.hash('123456');
  });

  it('issues a session and marks the user verified on a correct code', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(unverifiedUser);
    ctx.prisma.emailOtp.findFirst.mockResolvedValue({ ...otpRecord });
    ctx.prisma.user.update.mockResolvedValue({ ...unverifiedUser, emailVerifiedAt: new Date() });
    ctx.prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

    const result = await ctx.service.verifySignupOtp(unverifiedUser.email, '123456');

    expect(result.accessToken).toBeTruthy();
    expect(ctx.prisma.emailOtp.update).toHaveBeenCalledWith({
      where: { id: 'otp1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(ctx.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('increments attempts and rejects a wrong code', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(unverifiedUser);
    ctx.prisma.emailOtp.findFirst.mockResolvedValue({ ...otpRecord });

    await expect(
      ctx.service.verifySignupOtp(unverifiedUser.email, '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.prisma.emailOtp.update).toHaveBeenCalledWith({
      where: { id: 'otp1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('rejects once max attempts is reached, even with the correct code', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(unverifiedUser);
    ctx.prisma.emailOtp.findFirst.mockResolvedValue({
      ...otpRecord,
      attempts: EMAIL_OTP_MAX_ATTEMPTS,
    });

    await expect(
      ctx.service.verifySignupOtp(unverifiedUser.email, '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired code', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(unverifiedUser);
    ctx.prisma.emailOtp.findFirst.mockResolvedValue({
      ...otpRecord,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      ctx.service.verifySignupOtp(unverifiedUser.email, '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects for an already-verified account', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(dbUser);

    await expect(
      ctx.service.verifySignupOtp(dbUser.email, '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.resendSignupOtp', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('is a silent no-op for an unknown email (no enumeration)', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(null);
    await ctx.service.resendSignupOtp('nobody@example.com');
    expect(ctx.mail.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('is a silent no-op for an already-verified account', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(dbUser);
    await ctx.service.resendSignupOtp(dbUser.email);
    expect(ctx.mail.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('issues a fresh OTP for an existing unverified account', async () => {
    ctx.prisma.user.findUnique.mockResolvedValue(unverifiedUser);
    ctx.prisma.emailOtp.create.mockResolvedValue({ id: 'otp2' });

    await ctx.service.resendSignupOtp(unverifiedUser.email);

    expect(ctx.prisma.emailOtp.create).toHaveBeenCalledTimes(1);
    expect(ctx.mail.sendVerificationOtp).toHaveBeenCalledWith(
      unverifiedUser.email,
      expect.stringMatching(/^\d{6}$/),
    );
  });
});

describe('AuthService.refresh (rotation)', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('revokes the presented token and issues a new one', async () => {
    ctx.prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'old',
      userId: 'u1',
      revoked: false,
      expiresAt: new Date(Date.now() + 100_000),
      user: dbUser,
    });
    ctx.prisma.refreshToken.create.mockResolvedValue({ id: 'newid' });

    const result = await ctx.service.refresh('presented-token');

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    const updateArg = (ctx.prisma.refreshToken.update as AnyMock).mock.calls[0][0];
    expect(updateArg).toMatchObject({ where: { id: 'old' }, data: { revoked: true, replacedById: 'newid' } });
  });

  it('detects reuse of a revoked token and revokes the whole family', async () => {
    ctx.prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'old',
      userId: 'u1',
      revoked: true,
      expiresAt: new Date(Date.now() + 100_000),
      user: dbUser,
    });

    await expect(ctx.service.refresh('stolen-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revoked: false },
      data: { revoked: true },
    });
  });

  it('rejects a missing token', async () => {
    await expect(ctx.service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
