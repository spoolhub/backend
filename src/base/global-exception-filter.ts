import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
// eslint-disable-next-line no-restricted-syntax
import { HttpException as NestHttpException } from '@nestjs/common';
import { ResponseError } from './response/response-error';
import { HttpException } from './errors/http.exception';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    let httpStatus: number;
    let response: ResponseError<unknown, unknown>;

    if (exception instanceof NestHttpException) {
      httpStatus = exception.getStatus();
      response = {
        message: exception.message,
      };
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      response = exception.getResponse();
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      response = { message: 'Internal Server Error' };
    }

    this.logger.error(exception);

    httpAdapter.reply(ctx.getResponse(), response, httpStatus);
  }
}
