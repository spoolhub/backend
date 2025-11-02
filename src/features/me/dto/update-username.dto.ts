import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { lowerCaseTransformer } from 'src/utils/lower-case.transformer';

export class UpdateUsernameDto {
  @ApiProperty({
    description: 'The username of the user',
    example: 'johndoe',
  })
  @Transform(lowerCaseTransformer)
  @Matches(/^[a-z0-9_-]+$/) // chỉ cho phép ký tự alphanumeric, underscore và dash
  @MinLength(8)
  @MaxLength(50)
  @IsString()
  @IsNotEmpty()
  username: string;
}
