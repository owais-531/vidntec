import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE,
  forgotPasswordSchema,
  loginSchema,
  resendOtpSchema,
  resetPasswordSchema,
  signupSchema,
  verifyOtpSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type MeResponse,
  type OkResponse,
  type ResendOtpInput,
  type ResetPasswordInput,
  type SignupInput,
  type VerifyOtpInput,
} from '@vidntec/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { Env } from '../config/env';
import { AuthService } from './auth.service';
import { clearAuthCookies, setAuthCookies } from './cookies';
import { CurrentUser } from './current-user.decorator';
import { AccessTokenGuard } from './guards/access-token.guard';
import type { AuthenticatedUser } from './auth.types';

type AuthResponse = { user: MeResponse['user'] };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) body: SignupInput,
  ): Promise<OkResponse> {
    await this.auth.signup(body);
    return { ok: true };
  }

  @Post('verify-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) body: VerifyOtpInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, accessToken, refreshToken } = await this.auth.verifySignupOtp(
      body.email,
      body.code,
    );
    setAuthCookies(res, this.config, { accessToken, refreshToken });
    return { user };
  }

  @Post('resend-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendOtp(
    @Body(new ZodValidationPipe(resendOtpSchema)) body: ResendOtpInput,
  ): Promise<OkResponse> {
    await this.auth.resendSignupOtp(body.email);
    return { ok: true };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, accessToken, refreshToken } = await this.auth.login(body);
    setAuthCookies(res, this.config, { accessToken, refreshToken });
    return { user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const presented = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    try {
      const { user, accessToken, refreshToken } = await this.auth.refresh(presented);
      setAuthCookies(res, this.config, { accessToken, refreshToken });
      return { user };
    } catch (err) {
      clearAuthCookies(res, this.config);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OkResponse> {
    await this.auth.logout(req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined);
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return { user: await this.auth.me(user.id) };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<OkResponse> {
    await this.auth.forgotPassword(body.email);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OkResponse> {
    await this.auth.resetPassword(body.token, body.password);
    // Force re-login everywhere after a password change.
    clearAuthCookies(res, this.config);
    return { ok: true };
  }
}
