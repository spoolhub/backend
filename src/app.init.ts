import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { GlobalExceptionsFilter } from './base/global-exception-filter';
import { validationPipeOptions } from './base/validation-pipe.options';
import { ResolvePromisesInterceptor } from './utils/resolve-promises.interceptor';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

export const commonInit = (app: INestApplication) => {
  const moduleRef = app.select<AppModule>(AppModule);
  useContainer(moduleRef, { fallbackOnErrors: true });

  app.enableShutdownHooks();
  app.enableVersioning({ type: VersioningType.URI });
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionsFilter(app.get(HttpAdapterHost)));
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector))
  );
};
