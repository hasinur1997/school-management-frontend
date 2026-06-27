"use client"

/**
 * `useTeachers(params)` — reads the paginated teacher list
 * (`GET /teachers?search=&status=&page=&per_page=`, task 2.4), returning both the
 * rows and the pagination `meta` for the list screen.
 *
 * Search, status, and the page are folded into the query key (alongside the
 * super-admin `branch`) so each combination caches separately; only set filters
 * are sent. `keepPreviousData` keeps the current page visible while the next one
 * loads so pagination doesn't flash empty. Writes invalidate `["teachers"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Teacher, TeacherListParams } from "@/types/teacher"

export const TEACHERS_PER_PAGE = 15

/** Drop empty/`all` filters so the request only carries active ones. */
export function toTeacherQuery(params: TeacherListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? TEACHERS_PER_PAGE,
  }
  const search = params.search?.trim()
  if (search) query.search = search
  if (params.status && params.status !== "all") query.status = params.status
  return query
}

export function useTeachers(params: TeacherListParams) {
  const { branchParam } = useBranch()
  const query = toTeacherQuery(params)

  return useQuery({
    queryKey: queryKey("teachers", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<Teacher>("/teachers", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
