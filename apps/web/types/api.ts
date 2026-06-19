/**
 * API contract types — the Laravel `/api/v1` response envelope and the
 * pagination `meta` shape. Every response the client unwraps is described here.
 *
 * The API always replies with the same envelope:
 *   { success: boolean, message: string, data: T, meta?: PaginationMeta }
 *
 * Feature code never reads `success`/`message` directly — the Axios client
 * unwraps the envelope and returns `{ data, meta }` (see `lib/api`).
 */

/** The full envelope returned by every `/api/v1` endpoint. */
export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: PaginationMeta
}

/**
 * What the client hands back after unwrapping: the payload plus optional
 * pagination metadata for list endpoints.
 */
export interface ApiResult<T> {
  data: T
  meta?: PaginationMeta
}

/**
 * Laravel paginator metadata, as surfaced in the envelope's `meta` for
 * paginated list endpoints. Optional fields cover both length-aware and
 * simple paginators.
 */
export interface PaginationMeta {
  current_page: number
  per_page: number
  from: number | null
  to: number | null
  total?: number
  last_page?: number
  path?: string
}

/** A page of records plus its pagination metadata. */
export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

/** The `errors` map a `422` validation response carries: field → messages. */
export type ValidationErrors = Record<string, string[]>

/** The error envelope shape the API returns for non-2xx responses. */
export interface ApiErrorBody {
  success: false
  message: string
  errors?: ValidationErrors
}
