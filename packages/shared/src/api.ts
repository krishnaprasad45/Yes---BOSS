/** Standard envelopes — every backend response uses one of these. */

export interface ItemResponse<T> {
  data: T;
  message: string;
  status: "success" | "error";
  statusCode: number;
}

/** Offset-based pagination envelope (project_rules.md §10). Same shape on every list endpoint. */
export interface Paginated<T> {
  data: T[];
  pagination: {
    itemCount: number;
    pageCount: number;
    currentPage: number;
    hasNextPage: boolean;
  };
  message: string;
}

export interface ApiErrorBody {
  data: null;
  message: string;
  status: "error";
  statusCode: number;
}

/** Common list query params. Feature params extend this. */
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}
