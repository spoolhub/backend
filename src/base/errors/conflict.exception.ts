import { HttpStatus } from '@nestjs/common';
import { HttpException, HttpExceptionOptions } from './http.exception';

export class ConflictException<
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
      HttpStatus.CONFLICT,
      {
        message,
        details,
        metadata,
      },
      options
    );
  }
}
