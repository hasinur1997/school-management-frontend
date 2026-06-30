"use client"

/**
 * `useMyStudents()` — reads the authenticated parent's linked children from
 * `GET /me/students`. The endpoint is API role-gated; non-parents receive 403
 * and the UI renders an access state.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { LinkedStudent } from "@/types/parent"

export function useMyStudents(enabled = true) {
  return useQuery({
    queryKey: queryKey("parents", "my-students"),
    queryFn: () => api.get<LinkedStudent[]>("/me/students"),
    enabled,
    staleTime: STALE_TIME.STANDARD,
  })
}
