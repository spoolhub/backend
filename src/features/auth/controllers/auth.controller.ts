import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import type { Response } from 'express';
import { SetupDto } from '../dto/setup.dto';
import { UserId } from '../decorators/user-id.decorator';
import { TokenGuard } from '../guards/token.guard';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefreshTokenGuard } from '../guards/refresh-token.guard';
import { SessionId } from '../decorators/session-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register an user account',
    description: `This endpoint is responsible for creating a new user account with email and password.<br/>
      After successfully creating an account, it will send an email to the user with a link to confirm the user's email.`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'User account created successfully. An email has been sent for verification.',
    example: {},
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'An error occurred while validating input data.',
    examples: {
      'One field is invalid': {
        summary: 'Only one field is invalid',
        value: {
          details: {
            email: 'email must be an email',
          },
        },
      },
      'Multiple invalid fields': {
        summary: 'Multiple invalid fields',
        value: {
          details: {
            email: 'email must be an email',
            password: 'password is not strong enough',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email address has been used to register another account',
    example: {
      details: {
        email: 'Email address has been used to register another account',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An internal server error occurred',
    example: {
      message: 'Internal Server Error',
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Requests are being sent at too fast a rate',
    example: {
      message: 'Too many requests',
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return {};
  }

  @Get('verify/:token')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Verify user email',
    description: `This endpoint verifies a user's email with a token that was sent to their inbox. 
      On success, it sets 'token' and 'refreshToken' as HttpOnly cookies to authenticate the user for subsequent requests.`,
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description:
      'Email verified and user session created successfully. Authentication cookies are set in the response.',
    example: {},
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'The verification token is invalid or has expired.',
    examples: {
      'Invalid Token': {
        summary: 'Token is not found in the database',
        value: { message: 'Invalid token' },
      },
      'Expired Token': {
        summary: 'Token has passed its expiration date',
        value: { message: 'Token expired' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An internal server error occurred',
    example: {
      message: 'Internal Server Error',
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Requests are being sent at too fast a rate',
    example: {
      message: 'Too many requests',
    },
  })
  async verify(
    @Param('token') token: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const { token: authToken, refreshToken } =
      await this.authService.verify(token);
    response.cookie('token', authToken, { httpOnly: true, path: '/' });
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
    });
    return {};
  }

  @Post('login')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Log in a user',
    description: `Authenticates a user with their email and password. 
      On successful authentication, it sets 'token' and 'refreshToken' as HttpOnly cookies.`,
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description:
      'User logged in successfully. Authentication cookies are set in the response.',
    example: {},
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Invalid credentials or validation error.',
    examples: {
      'Invalid Email Format': {
        summary: 'Email format is incorrect',
        value: {
          details: { email: 'email must be an email' },
        },
      },
      'Unregistered Email': {
        summary: 'Email is not found in the database',
        value: {
          details: { email: 'Email is not registered' },
        },
      },
      'Incorrect Password': {
        summary: 'Password does not match',
        value: {
          details: { password: 'Password is incorrect' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An internal server error occurred',
    example: {
      message: 'Internal Server Error',
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Requests are being sent at too fast a rate',
    example: {
      message: 'Too many requests',
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const { token, refreshToken } = await this.authService.login(loginDto);
    response.cookie('token', token, { httpOnly: true, path: '/' });
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
    });
    return {};
  }

  @Post('setup')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(TokenGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Set up user profile',
    description: `Allows a newly verified user to set up their profile information, such as name and username. 
      This endpoint requires the user to be authenticated via a 'token' cookie obtained after verification or login.`,
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'User profile has been set up successfully.',
    example: {},
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'An error occurred while validating input data.',
    example: {
      details: {
        username: 'Username is required',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'The chosen username is already taken.',
    example: {
      message: 'Username already exists',
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication failed: The token is invalid or has expired.',
    example: {
      message: 'Invalid token or session expired',
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied: No authentication token was provided.',
    example: {
      message: 'Data access not allowed',
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An internal server error occurred',
    example: {
      message: 'Internal Server Error',
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Requests are being sent at too fast a rate',
    example: {
      message: 'Too many requests',
    },
  })
  async setup(@Body() setupDto: SetupDto, @UserId() userId: string) {
    await this.authService.setup(userId, setupDto);
    return {};
  }

  @Post('refresh')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RefreshTokenGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Refresh authentication tokens',
    description: `Uses a 'refreshToken' cookie to generate a new pair of 'token' and 'refreshToken'. 
      This allows the user to maintain their session without logging in again.`,
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description:
      'Tokens refreshed successfully. New cookies are set in the response.',
    example: {},
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'The refresh token is invalid, expired, or has already been used.',
    example: {
      message: 'Invalid refresh token or session expired',
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'The session associated with the token is invalid.',
    example: {
      message: 'Invalid session. Please log in again.',
    },
  })
  async refresh(
    @UserId() userId: string,
    @SessionId() sessionId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const { token, refreshToken } = await this.authService.refreshToken(
      userId,
      sessionId
    );
    response.cookie('token', token, { httpOnly: true, path: '/' });
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/',
    });
    return {};
  }
}
