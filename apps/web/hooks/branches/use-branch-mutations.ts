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
  /** Bengali branch name (optional). */
  name_bn?: string | null
  code?: string | null
  address?: string | null
  contact?: string | null
  /** Optional logo image to upload (sent as multipart when present). */
  logo?: File | null
}

/**
 * Build the request body for a branch write. A logo forces multipart form data
 * (the API stores it via the media library); otherwise a plain JSON object is
 * sent. `null`s are omitted so the API keeps existing values on edit.
 */
function toBranchPayload(input: BranchInput): FormData | Record<string, unknown> {
  const { logo, ...fields } = input
  const entries = Object.entries(fields).filter(([, v]) => v != null && v !== "")

  if (!logo) {
    return Object.fromEntries(entries)
  }

  const form = new FormData()
  for (const [key, value] of entries) {
    form.append(key, String(value))
  }
  form.append("logo", logo)
  return form
}

/** After a branch write, refresh both the branch list and the accessible
 * branches embedded in `/auth/me` (so the switcher reflects it immediately). */
function invalidateBranches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["branches"] })
  void queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
}

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BranchInput) =>
      api.post<Branch>("/branches", toBranchPayload(input)),
    onSuccess: () => invalidateBranches(queryClient),
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: BranchInput & { id: string }) => {
      const payload = toBranchPayload(input)
      // Laravel doesn't parse multipart bodies on PUT, so a logo update is sent
      // as POST with a `_method=PUT` override (spoofing only works from form
      // data). A plain JSON update keeps its real PUT.
      if (payload instanceof FormData) {
        payload.append("_method", "PUT")
        return api.post<Branch>(`/branches/${id}`, payload)
      }
      return api.put<Branch>(`/branches/${id}`, payload)
    },
    onSuccess: () => invalidateBranches(queryClient),
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
