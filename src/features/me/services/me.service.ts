import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../users/services/user.service';
import { IntrinsicException } from 'src/base/errors/intrinsic.exception';
import { FileService } from '../../files/services/file-service';
import { v7 as uuidv7 } from 'uuid';
import { extension } from 'mime-types';

@Injectable()
export class MeService {
  private logger = new Logger(MeService.name);

  constructor(
    private readonly userService: UserService,
    private readonly fileService: FileService
  ) {}

  async getMe(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new IntrinsicException('User not found');
    }

    return {
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar?.url,
    };
  }

  async updateUsername(
    userId: string,
    data: { username?: string }
  ): Promise<void> {
    await this.userService.updateUsername(userId, data);
  }

  async updateName(userId: string, data: { name?: string }): Promise<void> {
    await this.userService.updateName(userId, data);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File
  ): Promise<string> {
    const newFile = await this.fileService.uploadResource(
      file,

      `avatars/${uuidv7()}.${extension(file.mimetype)}`,
      userId
    );
    await this.userService.updateAvatar(userId, newFile.id);

    return newFile.url;
  }
}
