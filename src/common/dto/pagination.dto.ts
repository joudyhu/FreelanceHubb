export class PaginationDto {
  page = 1;
  limit = 20;
  sort: 'newest' | 'oldest' | 'budget_asc' | 'budget_desc' = 'newest';
}
