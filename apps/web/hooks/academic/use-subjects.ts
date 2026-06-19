"use client"

/**
 * `useSubjects(classId)` — reads `GET /classes/{class}/subjects`, the source for
 * `SubjectSelect`, which depends on a chosen class (task 2.1).
 *
 * Mirrors `useSections`: disabled until a class is selected, `classId` keyed so
 * each class caches its own subjects, branch folded into the key. Writes in
 * tasks 2.2/2.3 invalidate the `["subjects"]` key.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { Subject } from "@/types/academic"

export function useSubjects(classId: number | null | undefined) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("subjects", "list", {
      classId: classId ?? null,
      branch: branchParam,
    }),
    queryFn: () => api.get<Subject[]>(`/classes/${classId}/subjects`),
    staleTime: STALE_TIME.REFERENCE,
    enabled: classId != null,
  })
}
