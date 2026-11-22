import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString() @MinLength(5) @MaxLength(160) title: string;
  @IsString() @MinLength(20) @MaxLength(10000) description: string;
  @Type(() => Number) @IsInt() @Min(1) categoryId: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(10000000) budget: number;
}
export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MinLength(20) @MaxLength(10000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(10000000) budget?: number;
}
