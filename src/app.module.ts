import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfig } from './configs/app';
import { databaseConfig } from './configs/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { mailConfig } from './configs/mail';
import { MailModule } from './features/mail/mail.module';
import { AuthModule } from './features/auth/auth.module';
import { UserModule } from './features/users/user.module';
import ms from 'ms';
import { authConfig } from './configs/auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, mailConfig, authConfig],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        errorMessage: 'Too many requests',
        throttlers: [
          {
            ttl: ms(
              configService.get<string>('app.throttlerTTL', {
                infer: true,
              }) as ms.StringValue
            ),
            limit: configService.get<number>('app.throttlerLimit', {
              infer: true,
            }) as number,
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        extra: {
          // based on https://node-postgres.com/apis/pool
          // max connection pool size
          max: configService.get<number>('database.maxConnections', {
            infer: true,
          }) as number,
          ssl: (configService.get<boolean>('database.sslEnabled', {
            infer: true,
          }) as boolean)
            ? {
                rejectUnauthorized: configService.get<boolean>(
                  'database.rejectUnauthorized',
                  { infer: true }
                ) as boolean,
                ca:
                  (configService.get<string>('database.ca', {
                    infer: true,
                  }) as string) ?? undefined,
                key:
                  (configService.get<string>('database.key', {
                    infer: true,
                  }) as string) ?? undefined,
                cert:
                  (configService.get<string>('database.cert', {
                    infer: true,
                  }) as string) ?? undefined,
              }
            : undefined,
        },
      }),
    }),
    MailModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
