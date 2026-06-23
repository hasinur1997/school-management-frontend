"use client"

/**
 * `useAdmissions(params)` — reads the paginated admission review queue
 * (`GET /admissions?search=&status=&class_id=&page=&per_page=`, task 2.6),
 * returning both the rows and the pagination `meta`.
 *
 * Search, status, class, and the page are folded into the query key (alongside
 * the super-admin `branch`) so each combination caches separately; only set
 * filters are sent (the `all` status is omitted to list every application).
 * `keepPreviousData` keeps the current page visible while the next loads. A SHORT
 * stale window since the queue moves as applications arrive and are processed.
 * Approve/reject invalidate `["admissions"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Admission, AdmissionListParams } from "@/types/admission"

export const ADMISSIONS_PER_PAGE = 15

/**
 * Build the request params. The queue defaults to listing every application, so
 * `status` is sent only when narrowing to a single lifecycle state — the `all`
 * sentinel (and an absent status) is omitted. The class filter is the
 * `desired_class_id` column.
 */
function toParams(params: AdmissionListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? ADMISSIONS_PER_PAGE,
  }
  if (params.status && params.status !== "all") {
    query.status = params.status
  }
  const search = params.search?.trim()
  if (search) query.search = search
  if (params.desired_class_id != null) {
    query.desired_class_id = params.desired_class_id
  }
  return query
}

export function useAdmissions(params: AdmissionListParams) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("admissions", "list", { ...query, branch: branchParam }),
    queryFn: () => requestPaginated<Admission>("/admissions", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.SHORT,
  })
}
