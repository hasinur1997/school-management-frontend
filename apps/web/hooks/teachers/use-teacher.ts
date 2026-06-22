"use client"

/**
 * `useTeacher(id)` — reads a single teacher profile (`GET /teachers/{id}`,
 * task 2.4) for the detail screen. The active branch is folded into the key so a
 * super admin switching branch re-scopes (`branch_id` is attached by the
 * interceptor; an out-of-branch record returns `404`, which the screen renders
 * as not-found). Disabled until an id is present.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Teacher } from "@/types/teacher"

export function useTeacher(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("teachers", "detail", { id: id ?? "", branch: branchParam }),
    queryFn: () => api.get<Teacher>(`/teachers/${id}`),
    enabled: id != null,
    staleTime: STALE_TIME.STANDARD,
  })
}
