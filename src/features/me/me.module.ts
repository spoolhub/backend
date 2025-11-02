import { Module } from '@nestjs/common';
import { MeController } from './controllers/me.controller';
import { MeService } from './services/me.service';
import { UserModule } from '../users/user.module';
import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../files/file.module';

@Module({
  imports: [UserModule, AuthModule, FileModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
