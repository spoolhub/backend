import {
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { validateConfig } from '../utils/validate-config';
import { registerAs } from '@nestjs/config';

class EnvironmentVariablesValidator {
  @IsString()
  DB_HOST: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsInt()
  @IsOptional()
  DB_MAX_CONNECTIONS: number;

  @IsBoolean()
  @IsOptional()
  DB_SSL_ENABLED: boolean;

  @IsBoolean()
  @IsOptional()
  DB_REJECT_UNAUTHORIZED: boolean;

  @IsString()
  @IsOptional()
  DB_CA: string;

  @IsString()
  @IsOptional()
  DB_KEY: string;

  @IsString()
  @IsOptional()
  DB_CERT: string;
}

export type DatabaseConfig = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  name?: string;
  maxConnections: number;
  sslEnabled?: boolean;
  rejectUnauthorized?: boolean;
  ca?: string;
  key?: string;
  cert?: string;
};

export const databaseConfig = registerAs<DatabaseConfig>('database', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    maxConnections: process.env.DATABASE_MAX_CONNECTIONS
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : 100,
    sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
    ca: process.env.DATABASE_CA,
    key: process.env.DATABASE_KEY,
    cert: process.env.DATABASE_CERT,
  };
});
