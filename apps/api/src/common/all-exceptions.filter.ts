import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

/**
 * Normalises every error into the `apiErrorSchema` envelope. Unknown errors
 * become a generic 500 (details go to logs / Sentry, never to the client).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let body: Record<string, unknown>;
    if (isHttp) {
      const res = exception.getResponse();
      body =
        typeof res === 'string'
          ? { statusCode: status, error: exception.name, message: res }
          : { statusCode: status, ...(res as Record<string, unknown>) };
    } else {
      this.logger.error('Unhandled exception', exception as Error);
      Sentry.captureException(exception);
      body = {
        statusCode: status,
        error: 'Internal Server Error',
        message: 'Something went wrong',
      };
    }

    httpAdapter.reply(ctx.getResponse(), body, status);
  }
}
