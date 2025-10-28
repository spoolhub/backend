import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import {
  UserVerificationToken,
  UserVerificationTokenType,
} from 'src/features/auth/entities/user-verification_token.entity';
import { App } from 'supertest/types';
import { initApp } from '../../utils/init-app';

describe('Auth/Setup', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app;
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should setup a user account successfully', async () => {
    const registerDto = {
      email: new Date().getTime() + '@example.com',
      password: 'Password123!',
    };

    await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneOrFail({
      where: { email: registerDto.email },
    });

    const userVerificationTokenRepository = dataSource.getRepository(
      UserVerificationToken
    );
    const verificationToken =
      await userVerificationTokenRepository.findOneOrFail({
        where: {
          userId: user.id,
          type: UserVerificationTokenType.EMAIL_VERIFICATION,
        },
      });

    const response = await request(httpServer)
      .get(`/auth/verify/${verificationToken.token}`)
      .expect(202);

    const updatedUser = await userRepository.findOneOrFail({
      where: { id: user.id },
    });

    expect(updatedUser.verificatedAt).not.toBeNull();

    const deletedToken = await userVerificationTokenRepository.findOne({
      where: { token: verificationToken.token },
    });

    expect(deletedToken).toBeNull();

    const rawCookies = response.headers['set-cookie'];
    if (!rawCookies) {
      fail('Expected set-cookie header to be defined.');
    } else if (!Array.isArray(rawCookies)) {
      fail('Expected set-cookie header to be an array.');
    } else if (!rawCookies.every((cookie) => typeof cookie === 'string')) {
      fail('Expected set-cookie header to be an array of strings.');
    }

    const cookies = rawCookies as Array<string>;

    const accessTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('token=')
    );
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('refreshToken=')
    );

    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();

    // We can safely use the variables now
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(accessTokenCookie).toContain('Path=/');
    expect(refreshTokenCookie).toContain('HttpOnly');
    expect(refreshTokenCookie).toContain('Path=/');

    const setupPayload = {
      name: 'John Doe',
      username: 'johndoe_' + Date.now(),
    };

    // TODO setup request
    await request(httpServer)
      .post('/auth/setup')
      .set('Cookie', cookies)
      .send(setupPayload)
      .expect(202);

    const userAfterSetup = await userRepository.findOne({
      where: { email: registerDto.email },
    });

    expect(userAfterSetup).not.toBeNull();
    expect(userAfterSetup?.name).toBe(setupPayload.name);
    expect(userAfterSetup?.username).toBe(setupPayload.username);
  });

  it('should fail with 409 Conflict for an invalid/non-existent token', async () => {
    // ACT
    const response = await request(httpServer)
      .get('/auth/verify/this-token-should-not-exist')
      .expect(409);

    // ASSERT
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Invalid token');
  });

  it('should fail with 409 Conflict for an expired token', async () => {
    // ARRANGE: Tạo người dùng và token hết hạn
    const expiredEmail = 'expired-' + new Date().getTime() + '@example.com';
    // Bước 1: Giả định đăng ký để tạo user (hoặc tạo user trực tiếp)
    await request(httpServer)
      .post('/auth/register')
      .send({ email: expiredEmail, password: 'Password123!' });

    const userRepository = dataSource.getRepository(User);
    const expiredUser = await userRepository.findOneOrFail({
      where: { email: expiredEmail },
    });

    // Bước 2: Tạo thủ công một token đã hết hạn
    const expiredToken = 'expired_' + Date.now();
    const pastDate = new Date(Date.now() - 3600000); // 1 giờ trước

    await dataSource.getRepository(UserVerificationToken).save({
      token: expiredToken,
      userId: expiredUser.id,
      type: UserVerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: pastDate, // Token đã hết hạn
    });

    // ACT
    const response = await request(httpServer)
      .get(`/auth/verify/${expiredToken}`)
      .expect(409);

    // ASSERT
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Token expired');

    // KIỂM TRA SIDE EFFECT
    const tokenAfterFailure = await dataSource
      .getRepository(UserVerificationToken)
      .findOne({
        where: { token: expiredToken },
      });
    expect(tokenAfterFailure).not.toBeNull(); // Token không được xóa
    const userAfterFailure = await userRepository.findOneOrFail({
      where: { id: expiredUser.id },
    });
    expect(userAfterFailure.verificatedAt).toBeNull(); // User chưa được verify
  });

  it('should prevent re-verification with the same token', async () => {
    // ARRANGE: Đăng ký và lấy token
    const email = 'reverify-' + new Date().getTime() + '@example.com';
    await request(httpServer)
      .post('/auth/register')
      .send({ email, password: 'Password123!' });

    const user = await dataSource
      .getRepository(User)
      .findOneOrFail({ where: { email } });
    const verificationToken = await dataSource
      .getRepository(UserVerificationToken)
      .findOneOrFail({ where: { userId: user.id } });

    // ACT 1: Xác thực thành công lần đầu
    await request(httpServer)
      .get(`/auth/verify/${verificationToken.token}`)
      .expect(202);

    // ACT 2: Thử xác thực lại với cùng một token
    const response = await request(httpServer)
      .get(`/auth/verify/${verificationToken.token}`)
      .expect(409);

    // ASSERT
    // Token đã bị xóa, nên lần gọi thứ 2 sẽ báo là 'Invalid token'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Invalid token');
  });
});
