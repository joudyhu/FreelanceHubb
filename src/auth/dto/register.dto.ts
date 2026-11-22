import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100)
  name: string;
  @ApiProperty() @IsEmail() @MaxLength(255)
  email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72)
  password: string;
  @ApiProperty({ enum: ['CLIENT', 'FREELANCER'] }) @IsIn(['CLIENT', 'FREELANCER'])
  role: 'CLIENT' | 'FREELANCER';
}
