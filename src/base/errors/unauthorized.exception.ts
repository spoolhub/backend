import { HttpStatus } from '@nestjs/common';
import { HttpException, HttpExceptionOptions } from './http.exception';

export class UnauthorizedException<
  TDetails = undefined,
  TMetaData = undefined,
> extends HttpException<TDetails, TMetaData> {
  constructor(
    message?: string,
    details?: TDetails,
    metadata?: TMetaData,
    options?: HttpExceptionOptions
  ) {
    super(
      HttpStatus.UNAUTHORIZED,
      {
        message,
        details,
        metadata,
      },
      options
    );
  }
}
