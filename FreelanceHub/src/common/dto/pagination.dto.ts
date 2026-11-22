import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;

  @IsOptional() @IsIn(['newest', 'oldest', 'budget_asc', 'budget_desc'])
  sort: 'newest' | 'oldest' | 'budget_asc' | 'budget_desc' = 'newest';
}
