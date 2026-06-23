"use client"

/**
 * Subject write mutations (task 2.2). Subjects are created within a class
 * (`POST /classes/{class}/subjects`) but edited/deleted via their own routes
 * (`PUT /subjects/{id}`, `DELETE /subjects/{id}`) per the ticket's endpoint map.
 *
 * Invalidates the shared `["subjects"]` selector key (task 2.1) so `SubjectSelect`
 * refetches after a write.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Subject } from "@/types/academic"

/** Create/edit payload for a subject. */
export interface SubjectInput {
  name: string
  code?: string | null
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, ...input }: SubjectInput & { classId: string }) =>
      api.post<Subject>(`/classes/${classId}/subjects`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
  })
}

export function useUpdateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: SubjectInput & { id: string }) =>
      api.put<Subject>(`/subjects/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/subjects/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
  })
}
