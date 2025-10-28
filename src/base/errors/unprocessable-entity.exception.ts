import { HttpStatus } from '@nestjs/common';
import { HttpException, HttpExceptionOptions } from './http.exception';

export class UnprocessableEntityException<
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
      HttpStatus.UNPROCESSABLE_ENTITY,
      {
        message,
        details,
        metadata,
      },
      options
    );
  }
}
