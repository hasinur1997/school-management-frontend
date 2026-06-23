"use client"

/**
 * Session write mutations (task 2.2) — `POST /sessions`, `PUT /sessions/{id}`,
 * `DELETE /sessions/{id}`.
 *
 * Each mutation invalidates the shared `["sessions"]` selector key (task 2.1) so
 * `SessionSelect` and every session-scoped read refetch after a write. The API
 * is authoritative on validation (`422` → field errors at the form) and scoping
 * (`branch_id` is attached by the interceptor for super admin).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { AcademicSession } from "@/types/academic"

/** Create/edit payload for a session. */
export interface SessionInput {
  name: string
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SessionInput) =>
      api.post<AcademicSession>("/sessions", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: SessionInput & { id: string }) =>
      api.put<AcademicSession>(`/sessions/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/sessions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })
}
