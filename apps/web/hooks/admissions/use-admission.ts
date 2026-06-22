"use client"

/**
 * `useAdmission(id)` — reads a single admission application
 * (`GET /admissions/{id}`, task 2.6) for the review detail screen. The active
 * branch is folded into the key so a super admin switching branch re-scopes
 * (`branch_id` is attached by the interceptor; an out-of-branch record returns
 * `404`, rendered as not-found). Disabled until an id is present.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Admission } from "@/types/admission"

export function useAdmission(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("admissions", "detail", { id: id ?? 0, branch: branchParam }),
    queryFn: () => api.get<Admission>(`/admissions/${id}`),
    enabled: id != null,
    staleTime: STALE_TIME.SHORT,
  })
}
