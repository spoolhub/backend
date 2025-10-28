import { HttpStatus } from '@nestjs/common';
import { HttpException, HttpExceptionOptions } from './http.exception';

export class ForbiddenException<
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
      HttpStatus.FORBIDDEN,
      {
        message,
        details,
        metadata,
      },
      options
    );
  }
}
