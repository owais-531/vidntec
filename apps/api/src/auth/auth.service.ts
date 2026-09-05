import { randomBytes, randomInt } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_TTL_SECONDS,
  PASSWORD_RESET_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  type LoginInput,
  type PublicUser,
  type SignupInput,
} from '@vidntec/shared';
import { hashPassword, needsRehash, verifyPassword } from '@vidntec/shared/password';
import type { User } from '@vidntec/shared/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { Env } from '../config/env';
import type { AuthenticatedUser } from './auth.types';
import { TokenService } from './token.service';

interface IssuedTokens {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** A real argon2 hash of a random value; verified against on unknown-email
   *  logins so response timing does not reveal whether an account exists. */
  private readonly dummyHash: Promise<string> = hashPassword(
    randomBytes(24).toString('hex'),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ── public API ────────────────────────────────────────────────────────────

  async signup(input: SignupInput): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }

    // role is NOT taken from input — every signup is a customer. The DB column
    // also defaults to `customer`; admin is granted only manually in the DB.
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: 'customer',
      },
    });

    await this.issueAndSendOtp(user);
  }

  async login(input: LoginInput): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    // Always run a verify to keep timing roughly constant for unknown emails.
    const ok = user
      ? await verifyPassword(user.passwordHash, input.password)
      : await verifyPassword(await this.dummyHash, input.password);

    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before signing in');
    }

    if (needsRehash(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.password) },
      });
    }

    return this.issueTokens(user);
  }

  /** Verify a signup OTP and, on success, issue a session (the account's first login). */
  async verifySignupOtp(email: string, code: string): Promise<IssuedTokens> {
    const invalid = () => new UnauthorizedException('Invalid or expired code');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) throw invalid();

    const record = await this.prisma.emailOtp.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !record ||
      record.expiresAt < new Date() ||
      record.attempts >= EMAIL_OTP_MAX_ATTEMPTS
    ) {
      throw invalid();
    }

    if (record.codeHash !== this.tokens.hash(code)) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw invalid();
    }

    const verifiedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      return tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    });

    return this.issueTokens(verifiedUser);
  }

  /** Always resolves (no account enumeration). Re-sends a fresh OTP if the account exists and isn't verified yet. */
  async resendSignupOtp(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return;

    await this.issueAndSendOtp(user);
  }

  /** Rotate: consume the presented refresh token, issue a fresh pair. */
  async refresh(presentedToken: string | undefined): Promise<IssuedTokens> {
    if (!presentedToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokenHash = this.tokens.hash(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      // Reuse of an already-rotated token => likely theft. Nuke the family.
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const next = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: { userId: stored.userId, tokenHash: next.tokenHash, expiresAt },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true, replacedById: created.id },
      });
    });

    return {
      user: toPublicUser(stored.user),
      accessToken: this.tokens.signAccessToken(toAuthUser(stored.user)),
      refreshToken: next.token,
    };
  }

  async logout(presentedToken: string | undefined): Promise<void> {
    if (!presentedToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.tokens.hash(presentedToken), revoked: false },
      data: { revoked: true },
    });
  }

  async me(userId: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? toPublicUser(user) : null;
  }

  /** Always resolves (no account enumeration). Emails a reset link if the user exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = randomBytes(48).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hash(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
      },
    });

    const url = `${this.config.get('WEB_ORIGIN', { infer: true })}/reset-password?token=${token}`;
    await this.mail.sendPasswordReset(user.email, url);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hash(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('This reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      // Invalidate every existing session for this user.
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revoked: false },
        data: { revoked: true },
      });
    });
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private async issueAndSendOtp(user: User): Promise<void> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.emailOtp.create({
      data: {
        userId: user.id,
        codeHash: this.tokens.hash(code),
        expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_SECONDS * 1000),
      },
    });
    await this.mail.sendVerificationOtp(user.email, code);
  }

  private async issueTokens(user: User): Promise<IssuedTokens> {
    const next = this.tokens.generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: next.tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });
    return {
      user: toPublicUser(user),
      accessToken: this.tokens.signAccessToken(toAuthUser(user)),
      refreshToken: next.token,
    };
  }
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function toAuthUser(user: User): AuthenticatedUser {
  return { id: user.id, email: user.email, role: user.role };
}
