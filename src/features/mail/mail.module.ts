import { Module } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { MailerService } from './services/mailer.service';

@Module({
  providers: [MailService, MailerService],
  exports: [MailService],
})
export class MailModule {}
