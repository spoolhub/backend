import { HttpStatus, INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import request from 'supertest';
import { initApp } from '../../utils/init-app';
import { AuthWorkflow } from '../../workflows/auth.workflow';
import { User } from 'src/features/users/entities/user.entity';

describe('Me/UpdateName (PATCH /me/name)', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;
  let authWorkflow: AuthWorkflow;

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app;
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
    authWorkflow = new AuthWorkflow(httpServer, dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Success cases', () => {
    it('should update the name successfully for an authenticated user', async () => {
      // ARRANGE: Đăng ký, xác thực và đăng nhập user
      const userCredentials = {
        email: `user-${new Date().getTime()}@example.com`,
        password: 'Password123!',
      };
      const { user } = await authWorkflow.registerAndVerify(userCredentials);
      const agent = await authWorkflow.login(userCredentials);

      const newName = 'New Name';

      // ACT: Gửi request cập nhật name
      const response = await agent
        .patch('/me/name')
        .send({ name: newName })
        .expect(HttpStatus.OK);

      // ASSERT: Kiểm tra response và dữ liệu trong DB
      expect(response.body).toEqual({ message: 'Success' });

      const userRepository = dataSource.getRepository(User);
      const updatedUser = await userRepository.findOneByOrFail({ id: user.id });
      expect(updatedUser.name).toBe(newName);
    });
  });

  describe('Failure cases', () => {
    it('should return 403 Forbidden if the user is not authenticated', async () => {
      // ACT & ASSERT: Gửi request mà không có cookie xác thực
      await request(httpServer)
        .patch('/me/name')
        .send({ name: 'any_name' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 422 Unprocessable Entity for an invalid name format', async () => {
      // ARRANGE: Đăng nhập user
      const userCredentials = {
        email: `validator-${new Date().getTime()}@example.com`,
        password: 'Password123!',
      };
      await authWorkflow.registerAndVerify(userCredentials);
      const agent = await authWorkflow.login(userCredentials);

      // ACT & ASSERT: Gửi request với name quá ngắn
      await agent
        .patch('/me/name')
        .send({ name: 'a' })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
  });
});
