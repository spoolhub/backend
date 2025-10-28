import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import { App } from 'supertest/types';
import { PasswordService } from 'src/features/auth/services/password.service';
import { initApp } from '../../utils/init-app';

describe('Auth/Login', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;
  let passwordService: PasswordService;
  let userRepository: Repository<User>;

  const loginDto = {
    email: new Date().getTime() + '@example.com',
    password: 'Password123!',
  };

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app;
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
    passwordService =
      initializer.moduleFixture.get<PasswordService>(PasswordService);

    // Create a user to test login
    userRepository = dataSource.getRepository(User);
    const hashedPassword = await passwordService.hashPassword(
      loginDto.password
    );
    const user = userRepository.create({
      email: loginDto.email,
      passwordHash: hashedPassword,
      verificatedAt: new Date(Date.now()), // Assume email is verified for login test
    });
    await userRepository.save(user);

    // Create an unverified user
    const unverifiedEmail =
      'unverified-' + new Date().getTime() + '@example.com';
    const unverifiedUser = userRepository.create({
      email: unverifiedEmail,
      passwordHash: await passwordService.hashPassword('Password123!'),
      verificatedAt: null, // This user is not verified
    });
    await userRepository.save(unverifiedUser);

    // Create a suspended user
    const suspendedEmail = 'suspended-' + new Date().getTime() + '@example.com';
    const suspendedUser = userRepository.create({
      email: suspendedEmail,
      passwordHash: await passwordService.hashPassword('Password123!'),
      verificatedAt: new Date(),
      suspendedAt: new Date(), // This user is suspended
    });
    await userRepository.save(suspendedUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should login a user successfully', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send(loginDto)
      .expect(202);

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
  });

  it('should throw an unauthorized exception for wrong password', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send({ email: loginDto.email, password: 'WrongPassword!' })
      .expect(422);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.details.password).toBe('Password is incorrect');
  });

  it('should throw an unauthorized exception for a non-existent user', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'Password123!' })
      .expect(422);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.details.email).toBe('Email is not registered');
  });

  it('should throw a forbidden exception for an unverified user', async () => {
    // ARRANGE: Find the unverified user's email
    const registerDto = {
      email: new Date().getTime() + '@example.com',
      password: 'Password123!',
    };

    await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    // ACT & ASSERT
    const response = await request(httpServer)
      .post('/auth/login')
      .send(registerDto)
      .expect(403);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe(
      'Please verify your email before logging in.'
    );
  });

  it('should throw a forbidden exception for a suspended user', async () => {
    // ARRANGE: Find the unverified user's email
    const registerDto = {
      email: new Date().getTime() + '@example.com',
      password: 'Password123!',
    };

    await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    await userRepository.update(
      { email: registerDto.email },
      { suspendedAt: new Date() }
    );

    // ACT & ASSERT
    const response = await request(httpServer)
      .post('/auth/login')
      .send(registerDto)
      .expect(403);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.message).toBe('Your account has been suspended.');
  });
});
