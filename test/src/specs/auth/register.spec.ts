import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import {
  UserVerificationToken,
  UserVerificationTokenType,
} from 'src/features/auth/entities/user-verification_token.entity';
import { App } from 'supertest/types';
import { waitForEmail } from '../../utils/mailcheck';
import { initApp } from '../../utils/init-app';
import { MailService } from 'src/features/mail/services/mail.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';

describe('Auth/Register', () => {
  let app: INestApplication;
  let httpServer: App;
  let dataSource: DataSource;
  let originalMailService: MailService;

  beforeAll(async () => {
    const initializer = await initApp();
    app = initializer.app;
    httpServer = initializer.httpServer;
    dataSource = initializer.dataSource;
    originalMailService =
      initializer.moduleFixture.get<MailService>(MailService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a user successfully', async () => {
    const registerDto = {
      email: new Date().getTime() + '@example.com',
      password: 'Password123!',
    };

    await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email: registerDto.email },
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe(registerDto.email);

    const userVerificationTokenRepository = dataSource.getRepository(
      UserVerificationToken
    );
    const userVerificationToken = await userVerificationTokenRepository.find({
      where: {
        userId: user!.id,
        type: UserVerificationTokenType.EMAIL_VERIFICATION,
      },
    });
    expect(userVerificationToken).toHaveLength(1);

    const email = await waitForEmail(registerDto.email, 10000);
    expect(email.subject).toBe('Email Verification');
    expect(email.text.endsWith(userVerificationToken[0].token)).toBeTruthy();
  }, 15000);

  it('should throw a conflict exception if email already exists', async () => {
    const registerDto = {
      email: new Date().getTime() + '@example.com',
      password: 'Password123!',
    };

    // First, register the user
    await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    // Then, try to register again with the same email
    const response = await request(httpServer)
      .post('/auth/register')
      .send(registerDto)
      .expect(409);

    // ASSERT: Check the detailed error message as defined in the exception
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.details.email).toBe(
      'Email address has been used to register another account'
    );
  });

  it('should throw a validation error for an invalid email', async () => {
    const response = await request(httpServer)
      .post('/auth/register')
      .send({ email: 'invalid-email', password: 'Password123!' })
      .expect(422);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.details.email).toContain('email must be an email');
  });

  it('should throw a validation error for a weak password', async () => {
    const response = await request(httpServer)
      .post('/auth/register')
      .send({ email: 'test2@example.com', password: '123' })
      .expect(422);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.details.password).toContain(
      'password is not strong enough'
    );
  });

  it('should treat emails as case-insensitive', async () => {
    const emailBase = new Date().getTime() + 'case@example.com';
    const registerDtoLowerCase = {
      email: emailBase.toLowerCase(),
      password: 'Password123!',
    };
    const registerDtoUpperCase = {
      email: emailBase.toUpperCase(),
      password: 'Password123!',
    };

    // ARRANGE: Register with the lower-case email first
    await request(httpServer)
      .post('/auth/register')
      .send(registerDtoLowerCase)
      .expect(201);

    // ACT: Attempt to register with the upper-case version of the same email
    const response = await request(httpServer)
      .post('/auth/register')
      .send(registerDtoUpperCase)
      .expect(409); // Expect a conflict

    // ASSERT: Check the error message
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.details.email).toBe(
      'Email address has been used to register another account'
    );
  });

  describe('when mail service fails', () => {
    let failingApp: INestApplication;
    let failingHttpServer: App;

    beforeAll(async () => {
      // Create a new app instance with a mocked MailService
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(MailService)
        .useValue({
          ...originalMailService, // Keep other methods if any
          sendEmailVerificationEmail: jest
            .fn()
            .mockRejectedValue(new Error('SMTP Server Down')),
        })
        .compile();

      const initializer = await initApp(moduleFixture);
      failingApp = initializer.app;
      failingHttpServer = initializer.httpServer;
    });

    afterAll(async () => {
      await failingApp.close();
    });

    it('should not create a user if sending email fails (transaction rollback)', async () => {
      const registerDto = {
        email: new Date().getTime() + 'fail@example.com',
        password: 'Password123!',
      };

      // ACT: Attempt to register, expecting a server error due to the mock
      await request(failingHttpServer)
        .post('/auth/register')
        .send(registerDto)
        .expect(500); // Or whatever error the global filter returns

      // ASSERT: The user should NOT exist in the database due to transaction rollback
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { email: registerDto.email },
      });
      expect(user).toBeNull();
    });
  });
});
