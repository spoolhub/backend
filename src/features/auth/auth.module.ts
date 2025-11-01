import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { UserModule } from 'src/features/users/user.module';
import { MailModule } from 'src/features/mail/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserVerificationToken } from './entities/user-verification_token.entity';
import { UserSession } from './entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserVerificationToken, UserSession]),
    UserModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService],
})
export class AuthModule {}
