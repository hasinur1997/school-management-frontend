"use client"

/**
 * `useStudents(params)` — reads the paginated student list
 * (`GET /students?search=&status=&class_id=&section_id=&session_id=&page=&per_page=`,
 * task 2.7), returning the rows plus the pagination `meta` for the list screen.
 *
 * Search, status, the academic filters, and the page are folded into the query
 * key (alongside the super-admin `branch`) so each combination caches
 * separately; only set filters are sent. `keepPreviousData` keeps the current
 * page visible while the next one loads. Writes invalidate `["students"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { StudentListItem, StudentListParams } from "@/types/student"

export const STUDENTS_PER_PAGE = 15

/** Drop empty/`all` filters so the request only carries active ones. */
function toParams(params: StudentListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? STUDENTS_PER_PAGE,
  }
  const search = params.search?.trim()
  if (search) query.search = search
  if (params.status && params.status !== "all") query.status = params.status
  if (params.class_id != null) query.class_id = params.class_id
  if (params.section_id != null) query.section_id = params.section_id
  if (params.session_id != null) query.session_id = params.session_id
  return query
}

export function useStudents(params: StudentListParams) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("students", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<StudentListItem>("/students", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
