"use client"

/**
 * `useTeacherOptions()` — reads `GET /teachers` as the dropdown source for the
 * teacher-assignment selectors (task 2.3). The full teachers module is task 2.4;
 * this is the minimal read it needs, requesting a high `per_page` so the select
 * lists every teacher rather than a single page.
 *
 * Reference-style data, so it caches long. The active branch is folded into the
 * key so a super admin switching branch re-scopes; `branch_id` is attached to the
 * request by the API interceptor. When task 2.4 lands its own teachers hooks,
 * this can re-point at them.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { TeacherOption } from "@/types/teacher"

export function useTeacherOptions() {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("teachers", "options", { branch: branchParam }),
    queryFn: () =>
      api.get<TeacherOption[]>("/teachers", { params: { per_page: 200 } }),
    staleTime: STALE_TIME.REFERENCE,
  })
}
