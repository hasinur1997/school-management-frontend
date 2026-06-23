"use client"

/**
 * Parent write mutations (task 2.8):
 *   - `POST   /parents`
 *   - `POST   /parents/{parent}/students`
 *   - `DELETE /parents/{parent}/students/{student}`
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
    mutationFn: (input: ParentCreateInput) => api.post<ParentProfile>("/parents", input),
    onSuccess: invalidate,
  })
}

export function useLinkParentStudent() {
  const invalidate = useInvalidateParents()
  return useMutation({
    mutationFn: ({ parentId, studentId }: ParentLinkStudentInput) =>
      api.post<ParentProfile>(`/parents/${parentId}/students`, { student_id: studentId }),
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
