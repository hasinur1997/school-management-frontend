"use client"

/**
 * `useUser(id)` — reads a single user account (`GET /users/{id}`) for the
 * read-only profile view linked from "recorded by" on the attendance roster.
 * The active branch is folded into the key so a super admin switching branch
 * re-scopes; an unknown id returns `404`, which the screen renders as not-found.
 * Disabled until an id is present.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { UserAccount } from "@/types/user"

export function useUser(id: string | null) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("users", "detail", { id: id ?? "", branch: branchParam }),
    queryFn: () => api.get<UserAccount>(`/users/${id}`),
    enabled: id != null,
    staleTime: STALE_TIME.STANDARD,
  })
}
