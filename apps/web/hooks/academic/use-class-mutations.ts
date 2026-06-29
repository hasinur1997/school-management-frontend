"use client"

/**
 * Class write mutations (task 2.2) — `POST /classes`, `PUT /classes/{id}`,
 * `DELETE /classes/{id}`.
 *
 * Invalidates the shared `["classes"]` selector key (task 2.1) so `ClassSelect`
 * and dependent section/subject reads stay consistent after a write.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SchoolClass } from "@/types/academic"

/** Create/edit payload for a class. */
export interface ClassInput {
  name: string
  /** Grade level 1–12 (required by the API, unique per branch). */
  numeric_level: number
  /**
   * Target branch (super-admin create only). The API requires it in the body
   * when no branch is active; auto-scoped users omit it. Edit never sends it.
   */
  branch_id?: string
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ClassInput) => api.post<SchoolClass>("/classes", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["classes"] })
    },
  })
}

export function useUpdateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: ClassInput & { id: string }) =>
      api.put<SchoolClass>(`/classes/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["classes"] })
    },
  })
}

export function useDeleteClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/classes/${id}`),
    onSuccess: () => {
      // A class delete also drops its nested sections/subjects server-side.
      void queryClient.invalidateQueries({ queryKey: ["classes"] })
      void queryClient.invalidateQueries({ queryKey: ["sections"] })
      void queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
  })
}
