"use client"

/**
 * `useTeacherAttendanceList(params)` — the admin browse listing
 * `GET /teacher-attendance?teacher_id=&date=&month=&year=&status=&page=&per_page=`
 * (task 3.3), returning the rows plus pagination `meta`.
 *
 * Filters, page, and the super-admin `branch` are folded into the query key so
 * each combination caches separately; only set filters are sent.
 * `keepPreviousData` keeps the current page visible while the next loads. The
 * `teacher_id` is a public-id hash resolved to the integer key server-side.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type {
  TeacherAttendanceListParams,
  TeacherAttendanceRecord,
} from "@/types/teacher-attendance"

export const TEACHER_ATTENDANCE_PER_PAGE = 15

/** Drop empty filters so the request only carries active ones. */
function toParams(params: TeacherAttendanceListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? TEACHER_ATTENDANCE_PER_PAGE,
  }
  if (params.teacher_id) query.teacher_id = params.teacher_id
  if (params.date) query.date = params.date
  if (params.month) query.month = params.month
  if (params.year) query.year = params.year
  if (params.status) query.status = params.status
  return query
}

export function useTeacherAttendanceList(params: TeacherAttendanceListParams) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("teacher-attendance", "list", {
      ...query,
      branch: branchParam,
    }),
    queryFn: () =>
      requestPaginated<TeacherAttendanceRecord>("/teacher-attendance", {
        params: query,
      }),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
