import {
  Controller,
  Get,
  UseGuards,
  Body,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MeService } from '../services/me.service';
import { TokenGuard } from '../../auth/guards/token.guard';
import { UserId } from '../../auth/decorators/user-id.decorator';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { UpdateUsernameDto } from '../dto/update-username.dto';
import { UpdateNameDto } from '../dto/update-name.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UnprocessableEntityException } from 'src/base/errors/unprocessable-entity.exception';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('/')
  @UseGuards(TokenGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Get current user's basic info" })
  @ApiResponse({
    status: 200,
    description: "The user's basic info",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@UserId() userId: string): Promise<{
    username: string | null;
    name: string | null;
    email: string;
    avatar: string | null;
  }> {
    return this.meService.getMe(userId);
  }

  @Patch('/username')
  @UseGuards(TokenGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Update current user's username" })
  @ApiBody({ type: UpdateUsernameDto })
  @ApiResponse({
    status: 200,
    description: "The user's username has been updated successfully",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUsername(
    @UserId() userId: string,
    @Body() body: UpdateUsernameDto
  ): Promise<{
    message: string;
  }> {
    await this.meService.updateUsername(userId, body);
    return {
      message: 'Success',
    };
  }

  @Patch('/name')
  @UseGuards(TokenGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Update current user's name" })
  @ApiBody({ type: UpdateNameDto })
  @ApiResponse({
    status: 200,
    description: "The user's name has been updated successfully",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateName(
    @UserId() userId: string,
    @Body() body: UpdateNameDto
  ): Promise<{
    message: string;
  }> {
    await this.meService.updateName(userId, body);
    return {
      message: 'Success',
    };
  }

  @Patch('/avatar')
  @UseGuards(TokenGuard)
  @ApiCookieAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "The user's avatar has been updated successfully",
  })
  async updateAvatar(
    @UserId() userId: string,
    @UploadedFile()
    file: Express.Multer.File
  ): Promise<{
    url: string;
  }> {
    // check file size
    if (file.size > 1024 * 1024 * 1) {
      throw new UnprocessableEntityException(
        'File size is too large. Only files up to 1MB are allowed.'
      );
    }

    // check file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        'Invalid file type. Only JPEG and PNG are allowed.'
      );
    }

    const url = await this.meService.updateAvatar(userId, file);
    return {
      url,
    };
  }
}
