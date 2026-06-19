"use client"

/**
 * `useDashboard()` — reads `GET /dashboard`, the role- and branch-scoped summary
 * figures for the landing screen (task 1.7).
 *
 * The active branch is folded into the query key so a super admin switching
 * branch (or selecting consolidated) gets a separate cache entry and the cards
 * re-fetch under the new scope. `branch_id` itself is attached to the request by
 * the API interceptor from the branch bridge; non-super-admin sessions carry no
 * branch and the API scopes their data automatically.
 *
 * Figures are short-lived (today's attendance, today's collection move during
 * the day), so this uses the SHORT stale window rather than REFERENCE.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { DashboardSummary } from "@/types/dashboard"

export function useDashboard() {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("dashboard", "summary", { branch: branchParam }),
    queryFn: () => api.get<DashboardSummary>("/dashboard"),
    staleTime: STALE_TIME.SHORT,
  })
}
