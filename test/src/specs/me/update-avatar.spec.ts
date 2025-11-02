import request, { Test } from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import { initApp } from '../../utils/init-app';
import { AuthWorkflow } from '../../workflows/auth.workflow';
import * as path from 'path';

describe('Me/UpdateAvatar', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;
  let authWorkflow: AuthWorkflow;
  let agent: TestAgent<Test>;

  const userDto = {
    email: new Date().getTime() + '@example.com',
    password: 'Password123!',
  };

  const assetsPath = path.join(__dirname, '..', '..', '..', 'assets');
  // Dummy files
  const avatarPath = path.join(assetsPath, 'test-avatar.png');
  const invalidFilePath = path.join(assetsPath, 'test-file.txt');
  const largeFilePath = path.join(assetsPath, 'large-file.jpg');

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app;
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
    authWorkflow = new AuthWorkflow(httpServer, dataSource);

    // ARRANGE: Register, verify, and login user
    await authWorkflow.registerAndVerify({
      email: userDto.email,
      password: userDto.password,
    });

    agent = await authWorkflow.login({
      email: userDto.email,
      password: userDto.password,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("should update the current user's avatar successfully", async () => {
    const response = await agent
      .patch('/me/avatar')
      .attach('file', avatarPath)
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.url).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(typeof response.body.url).toBe('string');
  });

  it('should return 400 if file type is invalid', async () => {
    await agent.patch('/me/avatar').attach('file', invalidFilePath).expect(422);
  });

  it('should return 400 if file size is too large', async () => {
    await agent.patch('/me/avatar').attach('file', largeFilePath).expect(422);
  });

  it('should return 403 if cookie not contain auth token', async () => {
    await request(httpServer)
      .patch('/me/avatar')
      .attach('file', avatarPath)
      .expect(403);
  });
});
