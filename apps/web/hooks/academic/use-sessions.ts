"use client"

/**
 * `useSessions()` — reads `GET /sessions`, the shared source for `SessionSelect`
 * and every module that filters by academic session (task 2.1).
 *
 * Academic data is reference data (server-cached too), so it caches long; writes
 * in tasks 2.2/2.3 invalidate the `["sessions"]` key. The active branch is folded
 * into the key so a super admin switching branch gets a separate cache entry;
 * `branch_id` itself is attached to the request by the API interceptor.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { AcademicSession } from "@/types/academic"

export function useSessions() {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("sessions", "list", { branch: branchParam }),
    queryFn: () => api.get<AcademicSession[]>("/sessions"),
    staleTime: STALE_TIME.REFERENCE,
  })
}
