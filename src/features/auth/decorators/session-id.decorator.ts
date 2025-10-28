import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const SessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (request['sessionId']) {
      return request['sessionId'] as string;
    }
    return undefined;
  }
);
