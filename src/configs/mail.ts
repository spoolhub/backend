import { registerAs } from '@nestjs/config';

import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { validateConfig } from '../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  SMTP_HOST: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  SMTP_PORT: number;

  @IsString()
  @IsOptional()
  SMTP_USER: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD: string;

  @IsEmail()
  SMTP_DEFAULT_FROM_EMAIL: string;

  @IsString()
  SMTP_DEFAULT_FROM_NAME: string;

  @IsBoolean()
  SMTP_IGNORE_TLS: boolean;

  @IsBoolean()
  SMTP_SECURE: boolean;

  @IsBoolean()
  SMTP_REQUIRE_TLS: boolean;
}

export type MailConfig = {
  port: number;
  host?: string;
  user?: string;
  password?: string;
  defaultEmail?: string;
  defaultName?: string;
  ignoreTLS: boolean;
  secure: boolean;
  requireTLS: boolean;
};

export const mailConfig = registerAs<MailConfig>('mail', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    host: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    defaultEmail: process.env.MAIL_DEFAULT_EMAIL,
    defaultName: process.env.MAIL_DEFAULT_NAME,
    ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
  };
});
