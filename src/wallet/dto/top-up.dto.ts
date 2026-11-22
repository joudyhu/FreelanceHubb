import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
export class TopUpDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(100000) amount: number;
}
