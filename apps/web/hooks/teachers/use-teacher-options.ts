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

/**
 * Normalise `/teachers` into a bare options array regardless of how the backend
 * shapes a paginated list. The standard envelope keeps `data` as the row array
 * (with `meta` alongside), but some paginated endpoints nest the whole paginator
 * under `data` (`{ data: [...], current_page, … }`). Either way we want the rows;
 * anything unexpected degrades to an empty list rather than crashing the select.
 */
function toTeacherOptions(payload: unknown): TeacherOption[] {
  if (Array.isArray(payload)) return payload as TeacherOption[]
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: TeacherOption[] }).data
  }
  return []
}

export function useTeacherOptions() {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("teachers", "options", { branch: branchParam }),
    queryFn: async () => {
      const payload = await api.get<unknown>("/teachers", {
        params: { per_page: 200 },
      })
      return toTeacherOptions(payload)
    },
    staleTime: STALE_TIME.REFERENCE,
  })
}
