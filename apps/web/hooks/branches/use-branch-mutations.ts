"use client"

/**
 * Branch write mutations (task 2.3) — `POST /branches`, `PUT /branches/{id}`,
 * `DELETE /branches/{id}`. Super-admin only (gated at the UI; the API's `403`
 * is the real boundary).
 *
 * Each invalidates the shared `["branches"]` key so both the branch management
 * list and the 1.5 super-admin branch switcher (`useBranches`) refetch after a
 * write.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Branch } from "@/types/branch"

/** Create/edit payload for a branch. */
export interface BranchInput {
  name: string
  code?: string | null
  address?: string | null
  contact?: string | null
}

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BranchInput) => api.post<Branch>("/branches", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: BranchInput & { id: string }) =>
      api.put<Branch>(`/branches/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
  })
}

export function useDeleteBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/branches/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
  })
}
