import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { UserService } from 'src/features/users/services/user.service';
import { MailService } from 'src/features/mail/services/mail.service';
import { RegisterDto } from '../dto/register.dto';
import {
  UserVerificationToken,
  UserVerificationTokenType,
} from '../entities/user-verification_token.entity';
import { PasswordService } from './password.service';
import { Injectable, Logger } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { SetupDto } from '../dto/setup.dto';
import { UserSession } from '../entities/user-session.entity';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { ConflictException } from 'src/base/errors/conflict.exception';
import { UnprocessableEntityException } from 'src/base/errors/unprocessable-entity.exception';
import { ForbiddenException } from 'src/base/errors/forbidden.exception';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectRepository(UserVerificationToken)
    private readonly userVerificationTokenRepo: Repository<UserVerificationToken>,
    @InjectRepository(UserSession)
    private readonly userSessionRepo: Repository<UserSession>,
    private readonly dataSource: DataSource
  ) {}

  async register(registerDto: RegisterDto): Promise<void> {
    const { email, password } = registerDto;

    this.logger.log(`Starting registration process for email: ${email}`);

    // Bắt đầu một transaction
    await this.dataSource.transaction(async (manager) => {
      const userServiceWithManager = this.userService.withManager(manager);
      const userVerificationTokenRepoWithManager = manager.withRepository(
        this.userVerificationTokenRepo
      );

      const passwordHash = await this.passwordService.hashPassword(password);
      const user = await userServiceWithManager.register({
        email,
        passwordHash,
      });
      this.logger.debug(`User created with ID: ${user.id}`);

      // Cải thiện cách tạo token: đơn giản và an toàn
      const verificationToken = randomBytes(32).toString('hex');

      this.logger.debug(`Generated verification token for user: ${user.id}`);

      const verification = userVerificationTokenRepoWithManager.create({
        userId: user.id,
        token: verificationToken,
        type: UserVerificationTokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(
          Date.now() +
            ms(
              this.configService.get<string>('auth.verifyEmailExpires', {
                infer: true,
              }) as ms.StringValue
            )
        ),
      });
      await userVerificationTokenRepoWithManager.save(verification);

      // Gửi email chỉ sau khi các thao tác DB trong transaction đã sẵn sàng để commit
      this.logger.log(`Sending verification email to: ${user.email}`);
      await this.mailService.sendEmailVerificationEmail({
        to: user.email,
        data: { hash: verificationToken },
      });
    });
    this.logger.log(
      `Registration process for email ${email} completed successfully.`
    );
  }

  async verify(
    token: string
  ): Promise<{ token: string; refreshToken: string }> {
    return this.dataSource.transaction(async (manager) => {
      const userVerificationTokenRepoWithManager = manager.withRepository(
        this.userVerificationTokenRepo
      );
      const userServiceWithManager = this.userService.withManager(manager);

      const verificationToken =
        await userVerificationTokenRepoWithManager.findOne({
          where: { token },
        });

      if (!verificationToken) {
        this.logger.warn(`Verification failed: Invalid token provided.`);
        throw new ConflictException('Invalid token');
      }

      if (verificationToken.expiresAt < new Date()) {
        this.logger.warn(
          `Verification failed for user ${verificationToken.userId}: Token expired.`
        );
        throw new ConflictException('Token expired');
      }

      this.logger.log(`Token verified for user: ${verificationToken.userId}`);
      await userServiceWithManager.verify(verificationToken.userId);
      await userVerificationTokenRepoWithManager.delete(
        verificationToken.token
      );

      // _createTokens cũng cần sử dụng transaction manager
      return this._createTokens(verificationToken.userId, manager);
    });
  }

  async login(
    loginDto: LoginDto
  ): Promise<{ token: string; refreshToken: string }> {
    const { email, password } = loginDto;

    this.logger.log(`Login attempt for email: ${email}`);

    const user = await this.userService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Login failed: Email not registered - ${email}`);
      throw new UnprocessableEntityException('', {
        email: 'Email is not registered',
      });
    }
    this.logger.debug(`User found for login attempt: ${user.id}`);

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new UnprocessableEntityException('', {
        password: 'Password is incorrect',
      });
    }
    this.logger.debug(`Password validated for user: ${user.id}`);

    if (user.suspendedAt) {
      this.logger.warn(
        `Login failed: Account is suspended for user ${user.id}.`
      );
      throw new ForbiddenException('Your account has been suspended.');
    }

    if (!user.verificatedAt) {
      this.logger.warn(
        `Login failed: Account is not verified for user ${user.id}.`
      );
      throw new ForbiddenException(
        'Please verify your email before logging in.'
      );
    }

    this.logger.log(`Login successful for user: ${user.id}. Creating tokens.`);
    return this._createTokens(user.id);
  }

  async setup(userId: string, setupDto: SetupDto): Promise<void> {
    this.logger.log(`User ${userId} is setting up their profile.`);
    await this.userService.setupAccount({ id: userId, ...setupDto });
    this.logger.log(`Profile setup successful for user ${userId}.`);
  }

  async refreshToken(
    userId: string,
    sessionId: string
  ): Promise<{ token: string; refreshToken: string }> {
    return this.dataSource.transaction(async (manager) => {
      this.logger.log(
        `Token refresh requested for user ${userId}, session ${sessionId}`
      );
      const userSessionRepoWithManager = manager.withRepository(
        this.userSessionRepo
      );

      const session = await userSessionRepoWithManager.findOneBy({
        id: sessionId,
        userId: userId,
      });

      if (!session || session.invokedAt || session.expiresAt < new Date()) {
        this.logger.warn(
          `Refresh token rejected for user ${userId}, session ${sessionId}. Reason: Invalid, invoked, or expired session.`
        );
        throw new ForbiddenException('Invalid session. Please log in again.');
      }

      this.logger.debug(`Old session ${sessionId} is being invoked.`);
      await userSessionRepoWithManager.update(sessionId, {
        invokedAt: new Date(),
      });

      this.logger.log(`Creating new tokens for user ${userId}.`);
      return this._createTokens(userId, manager);
    });
  }

  private async _createTokens(
    userId: string,
    manager?: DataSource['manager']
  ): Promise<{ token: string; refreshToken: string }> {
    this.logger.debug(`_createTokens called for user: ${userId}`);
    const userSessionRepo = manager
      ? manager.withRepository(this.userSessionRepo)
      : this.userSessionRepo;
    const now = Date.now();

    const tokenExpiresIn = this.configService.get<ms.StringValue>(
      'auth.tokenExpires',
      {
        infer: true,
      }
    ) as ms.StringValue;
    const refreshTokenExpiresIn = this.configService.get<ms.StringValue>(
      'auth.refreshExpires',
      {
        infer: true,
      }
    ) as ms.StringValue;

    const tokenSecret = this.configService.get<string>('auth.tokenSecret', {
      infer: true,
    });
    const refreshTokenSecret = this.configService.get<string>(
      'auth.refreshSecret',
      {
        infer: true,
      }
    );

    const refreshTokenExpiresAt = now + ms(refreshTokenExpiresIn);

    const session = await userSessionRepo.save(
      userSessionRepo.create({
        userId,
        expiresAt: new Date(refreshTokenExpiresAt),
      })
    );

    this.logger.debug(
      `New session created with ID: ${session.id} for user ${userId}`
    );

    const token = await this.jwtService.signAsync(
      {
        userId,
      },
      {
        secret: tokenSecret,
        expiresIn: tokenExpiresIn,
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        userId,
        sessionId: session.id,
      },
      {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresIn,
      }
    );

    await userSessionRepo.save(session);

    return { token, refreshToken };
  }
}
