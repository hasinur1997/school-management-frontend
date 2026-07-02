"use client"

/**
 * `useExams(params)` — reads the paginated exam list
 * (`GET /exams?session_id=&class_id=&type=&status=&page=&per_page=`, task 4.1),
 * returning both the rows and the pagination `meta` for the list screen.
 *
 * Filters and the page are folded into the query key (alongside the super-admin
 * `branch`) so each combination caches separately; only set filters are sent
 * (`all`/empty are dropped). `keepPreviousData` keeps the current page visible
 * while the next loads. Writes invalidate `["exams"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Exam, ExamListParams } from "@/types/exam"

export const EXAMS_PER_PAGE = 15

/** Drop empty/`all` filters so the request only carries active ones. */
function toParams(params: ExamListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? EXAMS_PER_PAGE,
  }
  if (params.session_id) query.session_id = params.session_id
  if (params.class_id) query.class_id = params.class_id
  if (params.type && params.type !== "all") query.type = params.type
  if (params.status && params.status !== "all") query.status = params.status
  // Explicit screen-local branch filter; wins over the active branch in the
  // request interceptor.
  if (params.branch_id) query.branch_id = params.branch_id
  return query
}

export function useExams(params: ExamListParams) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("exams", "list", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () => requestPaginated<Exam>("/exams", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
