import ms from 'ms';
import { registerAs } from '@nestjs/config';
import { IsString } from 'class-validator';
import { validateConfig } from 'src/utils/validate-config';

export type AuthConfig = {
  tokenSecret?: string;
  tokenExpires?: ms.StringValue;
  refreshSecret?: string;
  refreshExpires?: ms.StringValue;
  verifyEmailExpires?: ms.StringValue;
};

class EnvironmentVariablesValidator {
  @IsString()
  AUTH_TOKEN_SECRET: string;

  @IsString()
  AUTH_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_REFRESH_TOKEN_SECRET: string;

  @IsString()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_VERIFY_EMAIL_EXPIRES_IN: string;
}

export const authConfig = registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    tokenSecret: process.env.AUTH_TOKEN_SECRET,
    tokenExpires: process.env.AUTH_TOKEN_EXPIRES_IN as ms.StringValue,
    refreshSecret: process.env.AUTH_REFRESH_TOKEN_SECRET,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
    verifyEmailExpires: process.env
      .AUTH_VERIFY_EMAIL_EXPIRES_IN as ms.StringValue,
  };
});
