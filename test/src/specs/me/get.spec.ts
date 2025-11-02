import request, { Test } from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import { initApp } from '../../utils/init-app';
import { AuthWorkflow } from '../../workflows/auth.workflow';
import { User } from 'src/features/users/entities/user.entity';

describe('Me/Get', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;
  let authWorkflow: AuthWorkflow;
  let agent: TestAgent<Test>;

  const userDto = {
    email: new Date().getTime() + '@example.com',
    password: 'Password123!',
    name: 'Test User',
    username: 'testuser',
  };

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app;
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
    authWorkflow = new AuthWorkflow(httpServer, dataSource);

    // ARRANGE: Đăng ký, xác thực, và cập nhật thông tin user
    const { user } = await authWorkflow.registerAndVerify({
      email: userDto.email,
      password: userDto.password,
    });

    const userRepository = dataSource.getRepository(User);
    await userRepository.update(user.id, {
      name: userDto.name,
      username: userDto.username,
    });

    // Đăng nhập để lấy agent đã xác thực
    agent = await authWorkflow.login({
      email: userDto.email,
      password: userDto.password,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("should get the current user's info successfully", async () => {
    const response = await agent.get('/me/').expect(200);
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    expect(response.body.email).toBe(userDto.email);
    expect(response.body.name).toBe(userDto.name);
    expect(response.body.username).toBe(userDto.username);
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  });

  it('should return 403 if cookie not contain auth token', async () => {
    await request(httpServer).get('/me/').expect(403);
  });
});
