import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  keepConnectionAlive: true,
  logging: process.env.NODE_ENV !== 'production' ? ['error'] : false,
  autoLoadEntities: true,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  subscribers: [__dirname + '/subscribers/**/*{.ts,.js}'],
  extra: {
    // based on https://node-postgres.com/api/pool
    // max connection pool size
    max: process.env.DB_MAX_CONNECTIONS
      ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
      : 100,
    ssl:
      process.env.DB_SSL_ENABLED === 'true'
        ? {
            rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'true',
            ca: process.env.DB_CA ?? undefined,
            key: process.env.DB_KEY ?? undefined,
            cert: process.env.DB_CERT ?? undefined,
          }
        : undefined,
  },
} as DataSourceOptions);
