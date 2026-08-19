import { z } from "zod";

/**
 * Shared pagination schema and types. Used across all list endpoints
 * to ensure consistent pagination behavior and response shape.
 *
 * Query params: ?limit=20&offset=0
 * Response includes: { data: [...], pagination: { total, limit, offset, hasMore } }
 */

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function buildPaginationMeta(total: number, limit: number, offset: number): PaginationMeta {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}
