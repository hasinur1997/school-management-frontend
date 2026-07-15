"use client"

/**
 * `useClasses()` — reads `GET /classes`, the shared source for `ClassSelect` and
 * the parent of section/subject selection (task 2.1).
 *
 * Reference data, cached long; writes in tasks 2.2/2.3 invalidate `["classes"]`.
 * The active branch is folded into the key (see `useSessions` for the rationale).
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { SchoolClass } from "@/types/academic"

export function useClasses() {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("classes", "list", { branch: branchParam }),
    queryFn: () => api.get<SchoolClass[]>("/classes"),
    staleTime: STALE_TIME.REFERENCE,
  })
}
