"use client"

/**
 * `useGradingScale()` — reads `GET /grading-scales`, the single global,
 * server-owned grade scale (task 4.2). The mark-entry grid uses it only to
 * *display* the grade/grade-point a mark resolves to — it never computes its
 * own thresholds or GPA (`feature-specs/12`, Rules).
 *
 * The scale is global (not branch-scoped) and rarely changes within a session,
 * so it caches as reference data with no branch in the key.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { GradingBand } from "@/types/mark"

export function useGradingScale() {
  return useQuery({
    queryKey: queryKey("grading-scales", "list"),
    queryFn: () => api.get<GradingBand[]>("/grading-scales"),
    staleTime: STALE_TIME.REFERENCE,
  })
}
