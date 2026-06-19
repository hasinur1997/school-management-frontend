"use client"

/**
 * `useSections(classId)` — reads `GET /classes/{class}/sections`, the source for
 * `SectionSelect`, which depends on a chosen class (task 2.1).
 *
 * The query is disabled until a class is selected, so the selector shows its
 * "choose a class first" state rather than fetching. `classId` is part of the
 * key so each class caches its own sections; the active branch is folded in too.
 * Writes in tasks 2.2/2.3 invalidate the `["sections"]` key.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Section } from "@/types/academic"

export function useSections(classId: number | null | undefined) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("sections", "list", {
      classId: classId ?? null,
      branch: branchParam,
    }),
    queryFn: () => api.get<Section[]>(`/classes/${classId}/sections`),
    staleTime: STALE_TIME.REFERENCE,
    enabled: classId != null,
  })
}
