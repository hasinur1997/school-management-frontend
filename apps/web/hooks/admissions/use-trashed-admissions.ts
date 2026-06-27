"use client"

/**
 * `useTrashedAdmissions(params)` — reads the soft-deleted admission applications
 * (`GET /admissions/trash?search=&desired_class_id=&page=&per_page=`), returning
 * the rows and the pagination `meta`. The trash holds applications of any
 * lifecycle status, so no status filter is sent; search and class narrow it just
 * like the live queue.
 *
 * Filters and the page fold into the query key (alongside the super-admin
 * `branch`) so each combination caches separately; `keepPreviousData` keeps the
 * current page visible while the next loads. A SHORT stale window since restore /
 * delete / force-delete move rows in and out. Those mutations invalidate
 * `["admissions"]`, which this key sits under, so the trash refetches.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Admission, AdmissionListParams } from "@/types/admission"

import { toAdmissionQuery } from "./use-admissions"

/** Trash never filters by status — only search / class / page apply. */
export type TrashedAdmissionParams = Omit<AdmissionListParams, "status">

export function useTrashedAdmissions(params: TrashedAdmissionParams) {
  const { branchParam } = useBranch()
  const query = toAdmissionQuery({ ...params, status: "all" })

  return useQuery({
    queryKey: queryKey("admissions", "trash", { ...query, branch: branchParam }),
    queryFn: () =>
      requestPaginated<Admission>("/admissions/trash", { params: query }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.SHORT,
  })
}
