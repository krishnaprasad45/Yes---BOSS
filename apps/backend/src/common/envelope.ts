import type { ItemResponse, Paginated } from "@yes-boss/shared";

export function ok<T>(data: T, message = "OK", statusCode = 200): ItemResponse<T> {
  return { data, message, status: "success", statusCode };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = "OK",
): Paginated<T> {
  const pageCount = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      itemCount: total,
      pageCount,
      currentPage: page,
      hasNextPage: page < pageCount,
    },
    message,
  };
}
