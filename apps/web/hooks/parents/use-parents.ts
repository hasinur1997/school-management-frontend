"use client"

/**
 * `useParents(params)` — reads the paginated parent list
 * (`GET /parents?search=&page=&per_page=`, task 2.8). The list payload includes
 * the compact linked students so the UI can show counts and unlink controls.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type { ParentListParams, ParentProfile } from "@/types/parent"

export const PARENTS_PER_PAGE = 15

function toParams(params: ParentListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? PARENTS_PER_PAGE,
  }
  const search = params.search?.trim()
  if (search) query.search = search
  return query
}

export function useParents(params: ParentListParams) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("parents", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<ParentProfile>("/parents", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
