import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class SetupDto {
  @ApiProperty({ example: 'John Doe', type: String })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john_doe', type: String })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/) // chỉ cho phép ký tự alphanumeric, underscore và dash
  username: string;
}
