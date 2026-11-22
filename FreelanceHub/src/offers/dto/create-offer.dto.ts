import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateOfferDto {
  @Type(() => Number) @IsInt() @Min(1) projectId: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(10000000) price: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(3650) durationDays: number;
  @IsString() @MinLength(10) @MaxLength(1000) message: string;
}
