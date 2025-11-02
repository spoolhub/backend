import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNameDto {
  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @MinLength(2)
  @MaxLength(50)
  @IsString()
  @IsNotEmpty()
  name: string;
}
