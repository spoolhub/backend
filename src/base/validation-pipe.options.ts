import { HttpStatus, ValidationPipeOptions } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { UnprocessableEntityException } from './errors/unprocessable-entity.exception';

function generateErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce(
    (accumulator, currentValue) => ({
      ...accumulator,
      [currentValue.property]: Object.values(
        currentValue.constraints ?? {}
      ).join(', '),
    }),
    {} as Record<string, string>
  );
}

export const validationPipeOptions: ValidationPipeOptions = {
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  whitelist: true,
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: (errors: ValidationError[]) => {
    return new UnprocessableEntityException<Record<string, string>>(
      undefined,
      generateErrors(errors),
      undefined
    );
  },
};
