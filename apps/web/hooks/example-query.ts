"use client"

/**
 * Reference example — the canonical shape every module's query hook follows.
 * It is not wired to a screen; it exists to document the data layer in code and
 * to verify the round-trip (typed key → client → unwrapped `data` + `meta`).
 *
 * A real module hook (e.g. `hooks/students/use-students.ts`) looks exactly like
 * `useExampleList` below, swapping the module slug, endpoint, and row type.
 */

import { useQuery } from "@tanstack/react-query"

import { STALE_TIME, queryKey, requestPaginated } from "@/lib/api"
import type { QueryParams } from "@/lib/api"
import type { PaginationMeta } from "@/types/api"

/** A row this example "lists" — stand-in for a real resource type. */
export interface ExampleRecord {
  id: number
  name: string
}

export interface ExampleListParams extends QueryParams {
  page?: number
  search?: string
}

/**
 * Paginated list query. Demonstrates the `[module, action, params]` key, the
 * client unwrapping the envelope to rows, and reading pagination `meta`.
 */
export function useExampleList(params: ExampleListParams = {}) {
  return useQuery({
    queryKey: queryKey("example", "list", params),
    queryFn: () =>
      requestPaginated<ExampleRecord>("/example", { params }),
    staleTime: STALE_TIME.STANDARD,
    // `data` is `{ data: ExampleRecord[]; meta?: PaginationMeta }` — rows and
    // pagination metadata, both already unwrapped from the API envelope.
  })
}

/** Helper showing how a screen reads the metadata off the unwrapped result. */
export function pageInfo(meta: PaginationMeta | undefined): string {
  if (!meta) return ""
  return `Page ${meta.current_page}${
    meta.last_page ? ` of ${meta.last_page}` : ""
  }`
}
