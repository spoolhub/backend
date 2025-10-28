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
import { UserSession } from 'src/features/auth/entities/user-session.entity';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { JwtService } from '@nestjs/jwt';
describe('Auth/Verify', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;
  let originalJwtService: JwtService;

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app; // App chính cho các test case thông thường
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
    originalJwtService = initializer.moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  // --- 1. HAPPY PATH (Tối ưu: Bổ sung kiểm tra UserSession) ---
  it('should verify a user successfully and create an authentication session', async () => {
    const registerDto = {
      email: new Date().getTime() + '@example.com',
      password: 'Password123!',
    };

    // ARRANGE: Đăng ký user
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

    // ACT: Thực hiện Verify
    const response = await request(httpServer)
      .get(`/auth/verify/${verificationToken.token}`)
      .expect(202);

    // ASSERT 1: Kiểm tra trạng thái User (đã được verify)
    const updatedUser = await userRepository.findOneOrFail({
      where: { id: user.id },
    });
    expect(updatedUser.verificatedAt).not.toBeNull();

    // ASSERT 2: Kiểm tra Token (đã bị xóa)
    const deletedToken = await userVerificationTokenRepository.findOne({
      where: { token: verificationToken.token },
    });
    expect(deletedToken).toBeNull();

    // ASSERT 3: Kiểm tra Session (đã được tạo) - CRUCIAL check for _createTokens side effect
    const userSessionRepository = dataSource.getRepository(UserSession);
    const session = await userSessionRepository.findOne({
      where: { userId: user.id },
    });
    expect(session).not.toBeNull();
    expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // ASSERT 4: Kiểm tra Cookies (token/refreshToken)
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
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(accessTokenCookie).toContain('Path=/');
    expect(refreshTokenCookie).toContain('HttpOnly');
    expect(refreshTokenCookie).toContain('Path=/');
  });

  // --- 2. EDGE CASE: INVALID TOKEN (Tối ưu: Kiểm tra message lỗi tường minh) ---
  it('should throw a conflict exception with specific message for an invalid token', async () => {
    // ACT
    const response = await request(httpServer)
      .get('/auth/verify/invalid-token')
      .expect(409);

    // ASSERT
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Invalid token');
  });

  // --- 3. EDGE CASE: EXPIRED TOKEN (Tối ưu: Kiểm tra không có side effects) ---
  it('should throw a conflict exception, not delete token, and not verify user for an expired token', async () => {
    const email = 'expired-' + new Date().getTime() + '@example.com';

    // ARRANGE: Đăng ký và lấy token
    await request(httpServer)
      .post('/auth/register')
      .send({ email, password: 'Password123!' })
      .expect(201);

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneOrFail({ where: { email } });

    const userVerificationTokenRepository = dataSource.getRepository(
      UserVerificationToken
    );
    const verificationToken =
      await userVerificationTokenRepository.findOneOrFail({
        where: { userId: user.id },
      });

    // Manually expire the token
    const oldExpiresAt = new Date(Date.now() - 10000);
    await userVerificationTokenRepository.update(verificationToken.token, {
      expiresAt: oldExpiresAt,
    });

    // ACT: Thực hiện Verify
    const response = await request(httpServer)
      .get(`/auth/verify/${verificationToken.token}`)
      .expect(409);

    // ASSERT 1: Kiểm tra message lỗi
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Token expired');

    // ASSERT 2: Kiểm tra Token (Không được bị xóa)
    const tokenAfterFailure = await userVerificationTokenRepository.findOne({
      where: { token: verificationToken.token },
    });
    expect(tokenAfterFailure).not.toBeNull();
    expect(tokenAfterFailure!.expiresAt.getTime()).toBe(oldExpiresAt.getTime());

    // ASSERT 3: Kiểm tra User (Chưa được verify)
    const userAfterFailure = await userRepository.findOneOrFail({
      where: { id: user.id },
    });
    expect(userAfterFailure.verificatedAt).toBeNull();
  });

  // --- 4. NEW CASE: TOKEN RE-USE (Kiểm tra token đã bị xóa sau khi sử dụng) ---
  it('should fail with "Invalid token" when attempting to verify with an already used token', async () => {
    const email = 'reuse-' + new Date().getTime() + '@example.com';

    // ARRANGE: Đăng ký
    await request(httpServer)
      .post('/auth/register')
      .send({ email, password: 'Password123!' })
      .expect(201);

    const user = await dataSource
      .getRepository(User)
      .findOneOrFail({ where: { email } });
    const userVerificationTokenRepository = dataSource.getRepository(
      UserVerificationToken
    );
    const verificationToken =
      await userVerificationTokenRepository.findOneOrFail({
        where: { userId: user.id },
      });
    const tokenString = verificationToken.token;

    // ACT 1: Xác thực thành công lần đầu
    await request(httpServer).get(`/auth/verify/${tokenString}`).expect(202);

    // ACT 2: Thử xác thực lại với CÙNG một token
    const response = await request(httpServer)
      .get(`/auth/verify/${tokenString}`)
      .expect(409);

    // ASSERT: Kiểm tra message lỗi (Vì token đã bị xóa, nó sẽ báo lỗi không tìm thấy token)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Invalid token');
  });

  // --- 5. NEW CASE: TRANSACTION ROLLBACK ---
  describe('when session creation fails (transaction rollback)', () => {
    let failingApp: INestApplication;
    let failingHttpServer: App;

    beforeAll(async () => {
      // Tạo một app instance mới với JwtService được mock để gây lỗi
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(JwtService)
        .useValue({
          ...originalJwtService,
          signAsync: jest
            .fn()
            .mockRejectedValue(new Error('JWT signing failed')),
        })
        .compile();

      const initializer = await initApp(moduleFixture);
      failingApp = initializer.app;
      failingHttpServer = initializer.httpServer;
    });

    afterAll(async () => {
      await failingApp.close();
    });

    it('should rollback all database changes', async () => {
      const email = 'rollback-' + new Date().getTime() + '@example.com';

      // ARRANGE: Đăng ký user bằng app chính và lấy token
      await request(httpServer)
        .post('/auth/register')
        .send({ email, password: 'Password123!' })
        .expect(201);

      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOneOrFail({ where: { email } });

      const userVerificationTokenRepository = dataSource.getRepository(
        UserVerificationToken
      );
      const verificationToken =
        await userVerificationTokenRepository.findOneOrFail({
          where: { userId: user.id },
        });

      // ACT: Thử verify bằng app lỗi (failingApp), mong đợi lỗi server
      await request(failingHttpServer)
        .get(`/auth/verify/${verificationToken.token}`)
        .expect(500);

      // ASSERT 1: User KHÔNG được xác thực (verificatedAt là null)
      const userAfterFailure = await userRepository.findOneOrFail({
        where: { id: user.id },
      });
      expect(userAfterFailure.verificatedAt).toBeNull();

      // ASSERT 2: Token xác thực KHÔNG bị xóa
      const tokenAfterFailure = await userVerificationTokenRepository.findOneBy(
        {
          token: verificationToken.token,
        }
      );
      expect(tokenAfterFailure).not.toBeNull();
    });
  });
});
