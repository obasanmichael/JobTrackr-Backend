import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type HttpErrorPayload = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttpException) {
      const err = exception instanceof Error ? exception : undefined;
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        err?.stack ?? String(exception),
      );
    }

    const defaultMessage = isHttpException
      ? exception.message
      : 'Internal server error';

    const defaultError = HttpStatus[status] ?? 'Error';
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;

    let message: string | string[] = defaultMessage;
    let error = defaultError;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      !Array.isArray(exceptionResponse)
    ) {
      const responseObject = exceptionResponse as {
        message?: string | string[];
        error?: string;
      };
      if (responseObject.message !== undefined) {
        message = responseObject.message;
      }
      if (responseObject.error) {
        error = responseObject.error;
      }
    }

    const payload: HttpErrorPayload = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (Array.isArray(message)) {
      payload.details = message;
    }

    response.status(status).json(payload);
  }
}
