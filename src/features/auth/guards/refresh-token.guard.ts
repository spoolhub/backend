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
export class RefreshTokenGuard implements CanActivate {
  private logger = new Logger(RefreshTokenGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);
    if (!token) {
      throw new ForbiddenException('Refresh token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: string;
        sessionId: string;
      }>(token, {
        secret: this.configService.get<string>('auth.refreshSecret'),
      });

      this.logger.debug({ refreshTokenPayload: payload });

      // Gán payload vào request để truy cập sau này
      request['userId'] = payload.userId;
      request['sessionId'] = payload.sessionId;
    } catch (cause) {
      throw new UnauthorizedException(
        'Invalid refresh token or session expired',
        undefined,
        undefined,
        { cause }
      );
    }
    return true;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    this.logger.debug(
      ('Extracting refresh token from header: ' +
        request.cookies['refreshToken']) as unknown
    );
    if (!request.cookies['refreshToken']) {
      return undefined;
    } else {
      return request.cookies['refreshToken'] as string;
    }
  }
}
