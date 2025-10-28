import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { commonInit } from 'src/app.init';
import { AppModule } from 'src/app.module';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

export async function initApp(moduleFixture?: TestingModule) {
  moduleFixture =
    moduleFixture ??
    (await Test.createTestingModule({
      imports: [AppModule],
    }).compile());
  const app = moduleFixture.createNestApplication({
    logger: process.env.DEBUG ? new Logger() : false,
  });
  commonInit(app);
  await app.init();

  const httpServer = app.getHttpServer() as App;
  const dataSource = moduleFixture.get<DataSource>(DataSource);

  return { moduleFixture, app, httpServer, dataSource };
}
