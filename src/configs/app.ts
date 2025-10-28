import { registerAs } from '@nestjs/config';
import { validateConfig } from '../utils/validate-config';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT: number;

  @IsString()
  APP_NAME: string;

  @IsString()
  APP_DOMAIN: string;

  @IsUrl({ require_tld: false })
  FRONTEND_DOMAIN: string;

  @IsUrl({ require_tld: false })
  ADMIN_DOMAIN: string;

  @IsBoolean()
  @IsOptional()
  ENABLE_DOCUMENTATION: boolean;

  @IsOptional()
  @IsString()
  THROTTLER_TTL: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  THROTTLER_LIMIT: number;
}

export type AppConfig = {
  nodeEnv: string;
  name: string;
  port: number;
  workingDirectory: string;
  appDomain: string;
  adminDomain: string;
  frontendDomain: string;
  enableDocumentation?: boolean;
  throttlerTTL?: string;
  throttlerLimit?: number;
};

export const appConfig = registerAs<AppConfig>('app', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME as string,
    port: process.env.APP_PORT
      ? parseInt(process.env.APP_PORT, 10)
      : process.env.PORT
        ? parseInt(process.env.PORT, 10)
        : 3000,
    workingDirectory: process.env.PWD || process.cwd(),
    appDomain: process.env.APP_DOMAIN as string,
    frontendDomain: process.env.FRONTEND_DOMAIN as string,
    adminDomain: process.env.ADMIN_DOMAIN as string,
    enableDocumentation: process.env.ENABLE_DOCUMENTATION === 'true' || false,
    throttlerTTL: process.env.THROTTLER_TTL as string,
    throttlerLimit: process.env.THROTTLER_LIMIT
      ? parseInt(process.env.THROTTLER_LIMIT, 10)
      : 10,
  };
});
