import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { MailData } from '../interfaces/mail-data.interface';
import path from 'path';

@Injectable()
export class MailService {
  private templateRootPath: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {
    this.templateRootPath = path.join(__dirname, '..', 'templates');
  }

  async sendEmailVerificationEmail(
    mailData: MailData<{ hash: string }>
  ): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-email'
    );
    url.searchParams.set('hash', mailData.data.hash);

    const emailConfirmTitle = 'Email Verification';
    const actionTitle = 'Verify Email';

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: emailConfirmTitle,
      text: `${emailConfirmTitle}: ${url.toString()}`,
      templatePath: path.join(this.templateRootPath, 'activation.hbs'),
      context: {
        title: emailConfirmTitle,
        url: url.toString(),
        actionTitle,
        app_name: this.configService.get('app.name', { infer: true }),
        text1: 'Hey!',
        text2: 'You’re almost ready to start enjoying',
        text3:
          'Simply click the big green button below to verify your email address.',
      },
    });
  }
}
