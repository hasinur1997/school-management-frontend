"use client"

/**
 * `usePublicSettings()` — reads `GET /public/settings`, the public configuration
 * the standalone admission form needs (branch/class options, the admission
 * payment flag, and the payment retry limit). Task 2.5.
 *
 * Unauthenticated: no token or `branch_id` is attached because the public form
 * mounts outside the auth/branch providers (the API client's session bridges
 * stay empty). Reference data, so it caches long.
 */

import { useQuery } from "@tanstack/react-query"

import { publicApi, queryKey, STALE_TIME } from "@/lib/api"
import type { PublicSettings } from "@/types/admission"

export function usePublicSettings() {
  return useQuery({
    queryKey: queryKey("public-settings", "detail"),
    queryFn: () => publicApi.get<PublicSettings>("/public/settings"),
    staleTime: STALE_TIME.REFERENCE,
    // Normalize defensively: the API may omit arrays/flags. Guarantee the shape
    // every consumer relies on so the wizard never crashes on a partial payload.
    select: (data): PublicSettings => ({
      ...data,
      branches: (Array.isArray(data?.branches) ? data.branches : []).map((b) => ({
        ...b,
        classes: Array.isArray(b?.classes) ? b.classes : [],
      })),
      admission_payment_enabled: Boolean(data?.admission_payment_enabled),
      payment_retry_limit:
        typeof data?.payment_retry_limit === "number" && data.payment_retry_limit > 0
          ? data.payment_retry_limit
          : 3,
    }),
  })
}
