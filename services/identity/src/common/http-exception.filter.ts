/**
 * Vote Capsule™ HTTP Exception Filter
 *
 * Transforms all HTTP exceptions into the standard ApiResponse error envelope.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>)['message'] ?? 'An error occurred';

    const errors =
      typeof exceptionResponse === 'object' &&
      Array.isArray((exceptionResponse as Record<string, unknown>)['message'])
        ? ((exceptionResponse as Record<string, unknown>)['message'] as string[]).map(
            (msg: string) => ({ code: 'VALIDATION_ERROR', message: msg }),
          )
        : [{ code: String(status), message: String(message) }];

    this.logger.warn(
      `HTTP ${status} — ${request.method} ${request.url}: ${String(message)}`,
    );

    response.status(status).json({
      success: false,
      errors,
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
      path: request.url,
    });
  }
}
