"use client"

/**
 * `useStudentEnrollments(id)` — reads a student's class history
 * (`GET /students/{id}/enrollments`, task 2.7), newest first. Authorized by the
 * same `StudentPolicy::view` rule as the profile (404-not-403 hiding). Folded
 * into the branch-scoped key; disabled until an id is present.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { StudentEnrollment } from "@/types/student"

export function useStudentEnrollments(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("students", "enrollments", { id: id ?? "", branch: branchParam }),
    queryFn: () => api.get<StudentEnrollment[]>(`/students/${id}/enrollments`),
    enabled: id != null,
    staleTime: STALE_TIME.STANDARD,
  })
}
