import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import request from 'supertest';
import { initApp } from '../../utils/init-app';
import { AuthWorkflow } from '../../workflows/auth.workflow';
import { User } from 'src/features/users/entities/user.entity';

describe('Me/UpdateUsername (PATCH /me)', () => {
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
    it('should update the username successfully for an authenticated user', async () => {
      // ARRANGE: Đăng ký, xác thực và đăng nhập user
      const userCredentials = {
        email: `user-${new Date().getTime()}@example.com`,
        password: 'Password123!',
      };
      const { user } = await authWorkflow.registerAndVerify(userCredentials);
      const agent = await authWorkflow.login(userCredentials);

      const newUsername = 'new_' + new Date().getTime();

      // ACT: Gửi request cập nhật username
      const response = await agent
        .patch('/me/username')
        .send({ username: newUsername })
        .expect(200);

      // ASSERT: Kiểm tra response và dữ liệu trong DB
      expect(response.body).toEqual({ message: 'Success' });

      const userRepository = dataSource.getRepository(User);
      const updatedUser = await userRepository.findOneByOrFail({ id: user.id });
      expect(updatedUser.username).toBe(newUsername);
    });
  });

  describe('Failure cases', () => {
    it('should return 403 Forbidden if the user is not authenticated', async () => {
      // ACT & ASSERT: Gửi request mà không có cookie xác thực
      await request(httpServer)
        .patch('/me/username')
        .send({ username: 'any_username' })
        .expect(403);
    });

    it('should return 409 Conflict if the username is already taken', async () => {
      // ARRANGE: Tạo 2 user
      // User 1 (sẽ cố gắng đổi username)
      const user1Credentials = {
        email: `user1-${new Date().getTime()}@example.com`,
        password: 'Password123!',
      };
      await authWorkflow.registerAndVerify(user1Credentials);
      const agent1 = await authWorkflow.login(user1Credentials);

      // User 2 (có username mà user 1 muốn lấy)
      const user2Credentials = {
        email: `user2-${new Date().getTime()}@example.com`,
        password: 'Password123!',
      };
      const { user: user2 } =
        await authWorkflow.registerAndVerify(user2Credentials);

      // Cập nhật username cho user 2 để đảm bảo nó đã tồn tại
      const existingUsername = 'already_taken_username';
      const userRepository = dataSource.getRepository(User);
      await userRepository.update(user2.id, { username: existingUsername });

      // ACT: User 1 cố gắng cập nhật username thành username của User 2
      const response = await agent1
        .patch('/me/username')
        .send({ username: existingUsername })
        .expect(409);

      // ASSERT: Kiểm tra thông báo lỗi
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.message).toBe('Username already exists');
    });

    it('should return 422 Unprocessable Entity for an invalid username format', async () => {
      // ARRANGE: Đăng nhập user
      const userCredentials = {
        email: `validator-${new Date().getTime()}@example.com`,
        password: 'Password123!',
      };
      await authWorkflow.registerAndVerify(userCredentials);
      const agent = await authWorkflow.login(userCredentials);

      // ACT & ASSERT: Gửi request với username quá ngắn
      await agent.patch('/me/username').send({ username: 'a' }).expect(422);
    });
  });
});
