import { Injectable } from '@nestjs/common';
import fs from 'node:fs/promises';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter, SendMailOptions } from 'nodemailer';
import { compile } from 'handlebars';

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = createTransport({
      host: configService.get<string>('mail.host', { infer: true }) as string,
      port: configService.get<number>('mail.port', { infer: true }) as number,
      ignoreTLS: configService.get<boolean>('mail.ignoreTLS', {
        infer: true,
      }) as boolean,
      secure: configService.get<boolean>('mail.secure', {
        infer: true,
      }) as boolean,
      requireTLS: configService.get<boolean>('mail.requireTLS', {
        infer: true,
      }) as boolean,
      auth: {
        user: configService.get<string>('mail.user', { infer: true }) as string,
        pass: configService.get<string>('mail.password', {
          infer: true,
        }) as string,
      },
    });
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: SendMailOptions & {
    templatePath: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    let html: string | undefined;
    if (templatePath) {
      const template = await fs.readFile(templatePath, 'utf-8');

      html = compile(template, { strict: true })(context);
    }

    await this.transporter.sendMail({
      ...mailOptions,
      from: mailOptions.from
        ? mailOptions.from
        : `"${this.configService.get('mail.defaultName', {
            infer: true,
          })}" <${this.configService.get('mail.defaultEmail', {
            infer: true,
          })}>`,
      html: mailOptions.html ? mailOptions.html : html,
    });
  }
}
