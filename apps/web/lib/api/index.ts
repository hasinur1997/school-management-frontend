/**
 * The single data layer. Feature code imports from `@/lib/api` only — it never
 * touches Axios or `fetch` directly (see `code-standards.md`, API Access).
 */

export {
  api,
  http,
  request,
  requestPaginated,
  API_BASE_URL,
} from "./client"
export {
  ApiError,
  ApiForbiddenError,
  ApiNetworkError,
  ApiNotFoundError,
  ApiValidationError,
  isApiError,
  isForbiddenError,
  isNotFoundError,
  isValidationError,
} from "./errors"
export {
  clearApiToken,
  getApiToken,
  handleUnauthorized,
  setApiToken,
  setUnauthorizedHandler,
} from "./session"
export {
  clearActiveBranchId,
  getActiveBranchId,
  setActiveBranchId,
} from "./branch"
export { queryKey } from "./query-keys"
export type {
  QueryAction,
  QueryKey,
  QueryModule,
  QueryParams,
} from "./query-keys"
export {
  STALE_TIME,
  createQueryClient,
  queryClientConfig,
} from "./query-client"
