"use client"

/**
 * `useBranches()` — reads `GET /branches`, the source for the super-admin branch
 * switcher (task 1.5) and branch management (task 2.3). Reference data, so it
 * caches long. Disabled unless `enabled` (only super admin needs it).
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { Branch } from "@/types/branch"

export function useBranches(enabled = true) {
  return useQuery({
    queryKey: queryKey("branches", "list"),
    queryFn: () => api.get<Branch[]>("/branches"),
    staleTime: STALE_TIME.REFERENCE,
    enabled,
  })
}
