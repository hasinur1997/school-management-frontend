"use client"

/**
 * `useTeacherAssignments(filters)` — reads
 * `GET /teacher-assignments?teacher_id=&class_id=&session_id=` (task 2.3).
 *
 * The three filters are folded into the query key (alongside the super-admin
 * `branch`) so each filter combination caches separately; only the set filters
 * are sent as params. Writes in this task invalidate the `["teacher-assignments"]`
 * key so the list refetches after a create/edit/delete.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { TeacherAssignment } from "@/types/academic"

export interface TeacherAssignmentFilters {
  teacher_id?: number | null
  class_id?: number | null
  session_id?: number | null
}

/** Drop null/undefined filters so the request only sends active ones. */
function toParams(filters: TeacherAssignmentFilters) {
  const params: Record<string, number> = {}
  if (filters.teacher_id != null) params.teacher_id = filters.teacher_id
  if (filters.class_id != null) params.class_id = filters.class_id
  if (filters.session_id != null) params.session_id = filters.session_id
  return params
}

export function useTeacherAssignments(filters: TeacherAssignmentFilters) {
  const { branchParam } = useBranch()
  const params = toParams(filters)

  return useQuery({
    queryKey: queryKey("teacher-assignments", "list", {
      ...params,
      branch: branchParam,
    }),
    queryFn: () =>
      api.get<TeacherAssignment[]>("/teacher-assignments", { params }),
    staleTime: STALE_TIME.STANDARD,
  })
}
