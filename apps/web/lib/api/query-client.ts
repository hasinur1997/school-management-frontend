/**
 * QueryClient factory and shared defaults.
 *
 * Defaults are deliberately conservative for a data-heavy admin app:
 *  - no refetch on window focus (heavy lists shouldn't re-fire on every tab in)
 *  - one retry, and only for network/5xx errors — typed 4xx errors are final
 *  - per-module stale times via `STALE_TIME` so reference data (academic
 *    structure, settings) caches longer than fast-moving data (attendance).
 */

import {
  QueryClient,
  type DefaultOptions,
  type QueryClientConfig,
} from "@tanstack/react-query"

import { ApiError } from "./errors"

const MINUTE = 60 * 1000

/**
 * Suggested stale times per data cadence. Hooks pass the matching value as
 * `staleTime`; the global default is `SHORT`.
 */
export const STALE_TIME = {
  /** Rarely changes within a session: academic structure, settings, roles. */
  REFERENCE: 30 * MINUTE,
  /** Lists and detail records that change occasionally. */
  STANDARD: 5 * MINUTE,
  /** Fast-moving data: attendance, dashboards, queues. */
  SHORT: 30 * 1000,
} as const

/** Don't retry typed client errors (401/403/404/422); retry the rest once. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && !error.retryable) {
    return false
  }
  return failureCount < 1
}

const defaultOptions: DefaultOptions = {
  queries: {
    refetchOnWindowFocus: false,
    staleTime: STALE_TIME.SHORT,
    retry: shouldRetry,
  },
  mutations: {
    retry: false,
  },
}

export const queryClientConfig: QueryClientConfig = { defaultOptions }

/** Create a fresh QueryClient. One per browser session (see `QueryProvider`). */
export function createQueryClient(): QueryClient {
  return new QueryClient(queryClientConfig)
}
