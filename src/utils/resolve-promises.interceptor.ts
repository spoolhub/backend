import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable()
export class ResolvePromisesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const deepResolvePromises = async (input: unknown): Promise<unknown> => {
      if (input instanceof Promise) {
        return await input;
      }

      if (Array.isArray(input)) {
        const resolvedArray = await Promise.all(input.map(deepResolvePromises));
        return resolvedArray;
      }

      if (input instanceof Date) {
        return input;
      }

      if (typeof input === 'object' && input !== null) {
        const keys = Object.keys(input);
        const resolvedObject = {};

        for (const key of keys) {
          const resolvedValue = await deepResolvePromises(input[key]);
          resolvedObject[key] = resolvedValue;
        }

        return resolvedObject;
      }

      return input;
    };

    return next.handle().pipe(mergeMap((data) => deepResolvePromises(data)));
  }
}
