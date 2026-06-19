"use client"

/**
 * Section write mutations (task 2.2). Sections are created within a class
 * (`POST /classes/{class}/sections`) but edited/deleted via their own routes
 * (`PUT /sections/{id}`, `DELETE /sections/{id}`) per the ticket's endpoint map.
 *
 * Invalidates the shared `["sections"]` selector key (task 2.1) so `SectionSelect`
 * refetches after a write.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Section } from "@/types/academic"

/** Create/edit payload for a section. */
export interface SectionInput {
  name: string
  capacity?: number | null
}

export function useCreateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, ...input }: SectionInput & { classId: number }) =>
      api.post<Section>(`/classes/${classId}/sections`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sections"] })
    },
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: SectionInput & { id: number }) =>
      api.put<Section>(`/sections/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sections"] })
    },
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<null>(`/sections/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sections"] })
    },
  })
}
