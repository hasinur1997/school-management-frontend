/**
 * Query-key convention for TanStack Query.
 *
 * Every key follows `[module, action, params]`:
 *   - `module`  — the API/feature module ("students", "invoices", …)
 *   - `action`  — what is being read ("list", "detail", "summary", …)
 *   - `params`  — an object of everything that scopes the result: filters,
 *                 ids, pagination, and — for super-admin sessions — the active
 *                 `branch`. Omitted when the read takes no parameters.
 *
 * Keeping `params` as a single object (not spread positional args) means cache
 * invalidation stays precise: invalidating `["students"]` clears every students
 * query, `["students", "list"]` clears just the lists, and an exact key clears
 * one page. Branch belongs *inside* `params` so a super admin switching branch
 * naturally gets a separate cache entry.
 *
 * Use `queryKey(...)` everywhere instead of hand-writing arrays so the shape
 * stays consistent across modules.
 */

/** A serializable bag of query parameters; `branch` is included for super admin. */
export interface QueryParams {
  [key: string]: unknown
  /** Active branch — present only for super-admin sessions. */
  branch?: string | number
}

/** Module slug — each feature module owns a stable prefix. */
export type QueryModule = string

/** Action within a module ("list", "detail", "summary", …). */
export type QueryAction = string

/** Tuple forms a query key can take, narrowest to widest. */
export type QueryKey =
  | readonly [QueryModule]
  | readonly [QueryModule, QueryAction]
  | readonly [QueryModule, QueryAction, QueryParams]

/**
 * Build a `[module, action, params]` query key. `params` is dropped when empty
 * so keys without parameters compare equal regardless of call style.
 */
export function queryKey(
  module: QueryModule,
  action?: QueryAction,
  params?: QueryParams
): QueryKey {
  if (action === undefined) {
    return [module] as const
  }
  if (params === undefined || Object.keys(params).length === 0) {
    return [module, action] as const
  }
  return [module, action, params] as const
}
