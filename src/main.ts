import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { commonInit } from './app.init';

void (async () => {
  const app = await NestFactory.create(AppModule);
  commonInit(app);

  const configService = app.get(ConfigService);
  const allowedOrigins: string[] = [
    configService.getOrThrow<string>('app.frontendDomain'),
    configService.getOrThrow<string>('app.adminDomain'),
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const enableDocumentation = configService.get<boolean>(
    'app.enableDocumentation',
    { infer: true }
  ) as boolean;

  if (enableDocumentation) {
    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('API')
          .setDescription('API docs')
          .addBearerAuth()
          .build()
      )
    );
  }

  const port = configService.getOrThrow<number>('app.port', {
    infer: true,
  }) as number;
  await app.listen(port);
  Logger.log(`Starting application on port: ${port}`, 'Bootstrap');
})();
