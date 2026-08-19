import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Offset pagination for the append-only collections, which grow without bound.
 *
 * The ValidationPipe runs with `enableImplicitConversion: false`, so query
 * params arrive as strings and `@Type(() => Number)` is what makes them
 * numbers. Without it every page would fail `@IsInt`.
 */
export class PaginationQueryDto {
  /** 1-based. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * Defaults live here rather than as DTO field initializers, the same way
 * services — not the schema — decide a goal's ACTIVE status: a caller holding a
 * plain object gets the same answer as one coming through the pipe.
 */
export function resolvePagination({ page, limit }: PaginationQueryDto): {
  page: number;
  limit: number;
  skip: number;
  take: number;
} {
  const resolvedPage = page ?? 1;
  const resolvedLimit = limit ?? DEFAULT_PAGE_SIZE;

  return {
    page: resolvedPage,
    limit: resolvedLimit,
    skip: (resolvedPage - 1) * resolvedLimit,
    take: resolvedLimit,
  };
}

export function toPage<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}
