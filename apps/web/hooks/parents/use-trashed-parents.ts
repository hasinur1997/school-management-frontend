"use client"

/**
 * `useTrashedParents(params)` — reads the soft-deleted parent list
 * (`GET /parents/trash`) with the same search/pagination shape as `/parents`.
 * Delete / restore / force-delete mutations invalidate the shared `parents`
 * key, so the live list and trash list stay reconciled.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type { ParentListParams, ParentProfile } from "@/types/parent"

import { toParentQuery } from "./use-parents"

export function useTrashedParents(params: ParentListParams) {
  const { branchParam } = useBranch()
  const query = toParentQuery(params)

  return useQuery({
    queryKey: queryKey("parents", "trash", { ...query, branch: branchParam }),
    queryFn: () =>
      requestPaginated<ParentProfile>("/parents/trash", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.SHORT,
  })
}
