import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ForbiddenException } from 'src/base/errors/forbidden.exception';
import { UnauthorizedException } from 'src/base/errors/unauthorized.exception';

@Injectable()
export class TokenGuard implements CanActivate {
  private logger = new Logger(TokenGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new ForbiddenException('Data access not allowed');
    }

    try {
      // 1. Xác thực token
      const payload = await this.jwtService.verifyAsync<{ userId: string }>(
        token,
        {
          secret: this.configService.get<string>('auth.tokenSecret'),
        }
      );

      this.logger.debug({ tokenPayload: payload });

      // 2. Gán payload vào request để truy cập sau này (tùy chọn)
      // Giống như Passport làm khi gọi validate() của Strategy
      request['userId'] = payload.userId;
    } catch (cause) {
      throw new UnauthorizedException(
        'Invalid token or session expired',
        undefined,
        undefined,
        {
          cause,
        }
      );
    }

    return true; // Cho phép truy cập
  }

  // Hàm trích xuất token từ header
  private extractTokenFromHeader(request: Request): string | undefined {
    this.logger.debug(
      ('Extracting token from header: ' + request.cookies['token']) as unknown
    );
    if (!request.cookies['token']) {
      return undefined;
    } else {
      return request.cookies['token'] as string;
    }
  }
}
