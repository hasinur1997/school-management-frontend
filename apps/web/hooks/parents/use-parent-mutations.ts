"use client"

/**
 * Parent write mutations (task 2.8):
 *   - `POST   /parents`
 *   - `POST   /parents/{parent}/students`
 *   - `DELETE /parents/{parent}/students/{student}`
 *   - `POST   /parents/{parent}/resend-credentials`
 *   - soft-delete trash lifecycle: delete / bulk delete / restore / force-delete
 *
 * All invalidate parent, linked-student, and student caches so list/detail/self
 * surfaces reconcile with the API after link changes.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  ParentCreateInput,
  ParentLinkStudentInput,
  ParentProfile,
} from "@/types/parent"

function useInvalidateParents() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["parents"] })
    void queryClient.invalidateQueries({ queryKey: ["students"] })
  }
}

export function useCreateParent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (input: ParentCreateInput) =>
      api.post<ParentProfile>("/parents", input),
    onSuccess: invalidate,
  })
}

export function useLinkParentStudent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: ({ parentId, studentId }: ParentLinkStudentInput) =>
      api.post<ParentProfile>(`/parents/${parentId}/students`, {
        student_id: studentId,
      }),
    onSuccess: invalidate,
  })
}

export function useUnlinkParentStudent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: ({ parentId, studentId }: ParentLinkStudentInput) =>
      api.delete<null>(`/parents/${parentId}/students/${studentId}`),
    onSuccess: invalidate,
  })
}

export function useResendParentCredentials() {
  return useMutation({
    mutationFn: (parentId: string) =>
      api.post<null>(`/parents/${parentId}/resend-credentials`),
  })
}

export function useDeleteParent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/parents/${id}`),
    onSuccess: invalidate,
  })
}

export function useBulkDeleteParents() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<{ deleted: number }>("/parents/bulk-delete", { ids }),
    onSuccess: invalidate,
  })
}

export function useRestoreParent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (id: string) => api.post<null>(`/parents/${id}/restore`),
    onSuccess: invalidate,
  })
}

export function useBulkRestoreParents() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<{ restored: number }>("/parents/bulk-restore", { ids }),
    onSuccess: invalidate,
  })
}

export function useForceDeleteParent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/parents/${id}/force`),
    onSuccess: invalidate,
  })
}

export function useBulkForceDeleteParents() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<{ deleted: number }>("/parents/bulk-force-delete", { ids }),
    onSuccess: invalidate,
  })
}
