import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import request, { Test } from 'supertest';
import { User } from 'src/features/users/entities/user.entity';
import {
  UserVerificationToken,
  UserVerificationTokenType,
} from 'src/features/auth/entities/user-verification_token.entity';
import { RegisterDto } from 'src/features/auth/dto/register.dto';
import TestAgent from 'supertest/lib/agent';

/**
 * Encapsulates common authentication workflows for E2E tests.
 * This class helps to reduce boilerplate code in test specs by providing
 * reusable methods for registration, verification, and login.
 */
export class AuthWorkflow {
  private readonly httpServer: App;
  private readonly dataSource: DataSource;

  constructor(httpServer: App, dataSource: DataSource) {
    this.httpServer = httpServer;
    this.dataSource = dataSource;
  }

  /**
   * Registers a new user via the API.
   * @param userDetails - The user's email and password.
   * @returns The created User entity from the database.
   */
  async register(
    userDetails: Pick<RegisterDto, 'email' | 'password'>
  ): Promise<User> {
    await request(this.httpServer)
      .post('/auth/register')
      .send(userDetails)
      .expect(201);

    const userRepository = this.dataSource.getRepository(User);
    return userRepository.findOneOrFail({
      where: { email: userDetails.email },
    });
  }

  /**
   * Retrieves the email verification token for a given user from the database.
   * @param userId - The ID of the user.
   * @returns The verification token string.
   */
  async getVerificationToken(userId: string): Promise<string> {
    const tokenRepository = this.dataSource.getRepository(
      UserVerificationToken
    );
    const verificationToken = await tokenRepository.findOneOrFail({
      where: {
        userId,
        type: UserVerificationTokenType.EMAIL_VERIFICATION,
      },
    });
    return verificationToken.token;
  }

  /**
   * Performs the email verification step.
   * @param token - The verification token.
   * @returns The supertest response object.
   */
  async verify(token: string): Promise<request.Response> {
    return request(this.httpServer).get(`/auth/verify/${token}`);
  }

  /**
   * A comprehensive workflow that registers a user, gets their verification token,
   * and then verifies their account.
   * @param userDetails - The user's email and password.
   * @returns An object containing the verified user and the supertest response from verification.
   */
  async registerAndVerify(
    userDetails: Pick<RegisterDto, 'email' | 'password'>
  ): Promise<{ user: User; response: request.Response }> {
    const user = await this.register(userDetails);
    const token = await this.getVerificationToken(user.id);
    const response = await this.verify(token);
    return { user, response };
  }

  /**
   * Logs in a user and returns an authenticated supertest agent.
   * This agent will have the authentication cookies set for subsequent requests.
   * @param credentials - The user's email and password.
   * @returns A supertest agent with authentication cookies.
   */
  async login(
    credentials: Pick<RegisterDto, 'email' | 'password'>
  ): Promise<TestAgent<Test>> {
    const response = await request(this.httpServer)
      .post('/auth/login')
      .send(credentials)
      .expect(202);

    const cookies = response.headers['set-cookie'];
    if (!cookies) {
      throw new Error('Login failed, no cookies were set.');
    }

    // Create a new agent and set the cookies to be used for authenticated requests
    const agent = request.agent(this.httpServer);
    agent.set('Cookie', cookies);

    return agent;
  }
}
