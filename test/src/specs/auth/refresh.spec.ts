import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import { App } from 'supertest/types';
import { initApp } from '../../utils/init-app';
import { UserSession } from 'src/features/auth/entities/user-session.entity';

describe('Auth/Refresh', () => {
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

  async function getVerifiedUserWithCookies(): Promise<{
    user: User;
    cookies: string[];
  }> {
    const registerDto = {
      email: `refresh-${new Date().getTime()}@example.com`,
      password: 'Password123!',
    };

    // 1. Register
    await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneByOrFail({
      email: registerDto.email,
    });
    user.verificatedAt = new Date(Date.now());
    await userRepository.save(user);

    // 2. Login to get cookies
    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send(registerDto)
      .expect(202);

    const rawCookies = loginResponse.headers['set-cookie'];
    if (!rawCookies) {
      fail('Expected set-cookie header to be defined.');
    } else if (!Array.isArray(rawCookies)) {
      fail('Expected set-cookie header to be an array.');
    } else if (!rawCookies.every((cookie) => typeof cookie === 'string')) {
      fail('Expected set-cookie header to be an array of strings.');
    }

    const cookies = rawCookies as Array<string>;
    return { user, cookies };
  }

  it('should refresh tokens successfully with a valid refresh token', async () => {
    // ARRANGE: Get a logged-in user with valid cookies
    const { cookies: initialCookies } = await getVerifiedUserWithCookies();
    const initialRefreshToken = initialCookies.find((c) =>
      c.startsWith('refreshToken=')
    );

    // ACT: Call the refresh endpoint
    const refreshResponse = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', initialCookies)
      .expect(202);

    // ASSERT 1: Check for new cookies
    const newRawCookies = refreshResponse.headers['set-cookie'];
    if (!newRawCookies) {
      fail('Expected set-cookie header to be defined.');
    } else if (!Array.isArray(newRawCookies)) {
      fail('Expected set-cookie header to be an array.');
    } else if (!newRawCookies.every((cookie) => typeof cookie === 'string')) {
      fail('Expected set-cookie header to be an array of strings.');
    }

    const rawCookies = newRawCookies as Array<string>;

    const newAccessToken = rawCookies.find((c) => c.startsWith('token='));
    const newRefreshToken = rawCookies.find((c) =>
      c.startsWith('refreshToken=')
    );

    expect(newAccessToken).toBeDefined();
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(initialRefreshToken); // Ensure token rotation

    // ASSERT 2: Check the database state
    const sessionRepository = dataSource.getRepository(UserSession);
    const sessions = await sessionRepository.find({
      order: { createdAt: 'ASC' },
    });

    const oldSession = sessions.find((s) => s.invokedAt !== null);
    const newSession = sessions.find((s) => s.invokedAt === null);

    expect(oldSession).toBeDefined(); // The old session should be marked as invoked
    expect(newSession).toBeDefined(); // A new session should have been created
  });

  it('should fail if no refresh token is provided', async () => {
    const response = await request(httpServer)
      .post('/auth/refresh')
      .expect(403);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Refresh token not found');
  });

  it('should fail with an invalid or malformed refresh token', async () => {
    const response = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', 'refreshToken=this.is.a.fake.token')
      .expect(401);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe(
      'Invalid refresh token or session expired'
    );
  });

  it('should fail if the refresh token has already been used (rotation check)', async () => {
    // ARRANGE: Get initial cookies and then refresh them once
    const { cookies: initialCookies } = await getVerifiedUserWithCookies();

    await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', initialCookies)
      .expect(202);

    // ACT: Try to use the *initial* (now invoked) refresh token again
    const response = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', initialCookies)
      .expect(403);

    // ASSERT
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Invalid session. Please log in again.');
  });

  it('should fail if the session does not exist in the database', async () => {
    // ARRANGE: Get valid cookies
    const { user, cookies } = await getVerifiedUserWithCookies();

    // Manually delete the session from the database
    const sessionRepository = dataSource.getRepository(UserSession);
    await sessionRepository.delete({ userId: user.id });

    // ACT: Try to refresh with a token whose session is now gone
    const response = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(403);

    // ASSERT
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Invalid session. Please log in again.');
  });
});
