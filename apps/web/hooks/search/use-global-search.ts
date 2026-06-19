"use client"

/**
 * `useGlobalSearch` — orchestrates the record half of the topbar command search
 * (task 1.6). It fans the (debounced) query out across every permitted record
 * source in parallel, returning grouped, permission-filtered results plus an
 * aggregate loading flag. Modules are handled separately in the palette UI from
 * the static nav model; this hook owns only the endpoint-backed records.
 *
 * Permission filtering happens before a source is ever queried, and a failing
 * source contributes no rows rather than breaking the panel (the API stays
 * authoritative when a result is actually selected).
 */

import * as React from "react"
import { useQueries } from "@tanstack/react-query"

import { queryKey, STALE_TIME } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"
import { useBranch } from "@/components/branch/branch-provider"
import type { SearchResult } from "@/types/search"
import { MIN_QUERY_LENGTH, RECORD_SOURCES } from "./search-sources"

export interface SearchGroup {
  heading: string
  results: SearchResult[]
}

export interface GlobalSearchState {
  /** Record groups with at least one hit. */
  groups: SearchGroup[]
  /** Any permitted source is still fetching for the current query. */
  isLoading: boolean
  /** The query met the minimum length, so record sources were queried. */
  isActive: boolean
}

export function useGlobalSearch(query: string): GlobalSearchState {
  const { hasPermission } = useAuth()
  const { branchParam } = useBranch()

  const trimmed = query.trim()
  const isActive = trimmed.length >= MIN_QUERY_LENGTH

  // Only query sources the user can access (`code-standards.md`, Authorization).
  const sources = React.useMemo(
    () => RECORD_SOURCES.filter((source) => hasPermission(source.permission)),
    [hasPermission]
  )

  const queries = useQueries({
    queries: sources.map((source) => ({
      queryKey: queryKey("search", source.module, {
        q: trimmed,
        branch: branchParam,
      }),
      queryFn: () => source.fetch(trimmed),
      enabled: isActive,
      staleTime: STALE_TIME.SHORT,
      // A 4xx/5xx from one module must not retry-storm the palette; it just
      // yields no rows for that group.
      retry: false,
    })),
  })

  return React.useMemo<GlobalSearchState>(() => {
    const groups: SearchGroup[] = []
    for (let i = 0; i < sources.length; i++) {
      const results = queries[i]?.data
      if (results && results.length > 0) {
        groups.push({ heading: sources[i]!.group, results })
      }
    }
    return {
      groups,
      isLoading: isActive && queries.some((q) => q.isFetching),
      isActive,
    }
  }, [sources, queries, isActive])
}
