"use client"

/**
 * `useStudent(id)` — reads a single student profile (`GET /students/{id}`,
 * task 2.7) for the detail screen. The active branch is folded into the key so a
 * super admin switching branch re-scopes (`branch_id` is attached by the
 * interceptor). The API authorizes via `StudentPolicy::view` and hides a record
 * it can't show as `404` (not `403`) — a student/parent only sees their own /
 * linked record; the screen renders that as not-found. Disabled until an id is
 * present.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Student } from "@/types/student"

export function useStudent(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("students", "detail", { id: id ?? "", branch: branchParam }),
    queryFn: () => api.get<Student>(`/students/${id}`),
    enabled: id != null,
    staleTime: STALE_TIME.STANDARD,
  })
}
