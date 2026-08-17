/**
 * Pagination utility untuk Waru Backend
 *
 * Default: 10 item per halaman
 * Maksimal: 100 item per halaman
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;

export interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Parse dan validasi query pagination dari request.
 * Mengembalikan nilai `page` dan `limit` yang sudah aman dipakai.
 *
 * @example
 * const { page, limit, skip } = parsePagination({ page: "2", limit: "20" });
 * // → { page: 2, limit: 20, skip: 20 }
 */
export function parsePagination(query: PaginationQuery): {
  page: number;
  limit: number;
  skip: number;
} {
  let page = parseInt(String(query.page ?? DEFAULT_PAGE));
  let limit = parseInt(String(query.limit ?? DEFAULT_LIMIT));

  // Pastikan nilai valid
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;

  // Batasi maksimal
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Bungkus data hasil query dengan metadata pagination.
 *
 * @example
 * const result = buildPaginationResult(users, total, page, limit);
 */
export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
