"use client"

/**
 * Teacher write mutations (task 2.4):
 *   - `POST  /teachers`                       — create (API generates + emails credentials)
 *   - `PUT   /teachers/{id}`                  — update profile + assignments
 *   - `PATCH /teachers/{id}/status`           — toggle active/inactive
 *   - `POST  /teachers/{id}/photo`            — upload photo (multipart)
 *   - `POST  /teachers/{id}/resend-credentials` — re-dispatch login credentials
 *
 * Each invalidates the `["teachers"]` key so the list, detail, and selector
 * options refetch after a write. The API stays authoritative on validation
 * (`422` → field errors at the form), credential generation, and branch scoping
 * (`branch_id` via the interceptor). Credentials are never built client-side.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Teacher, TeacherInput, TeacherUpdateInput } from "@/types/teacher"

function useInvalidateTeachers() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["teachers"] })
  }
}

export function useCreateTeacher() {
  const invalidate = useInvalidateTeachers()
  return useMutation({
    mutationFn: (input: TeacherInput) => api.post<Teacher>("/teachers", input),
    onSuccess: invalidate,
  })
}

export function useUpdateTeacher() {
  const invalidate = useInvalidateTeachers()
  return useMutation({
    mutationFn: ({ id, ...input }: TeacherUpdateInput & { id: string }) =>
      api.put<Teacher>(`/teachers/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useToggleTeacherStatus() {
  const invalidate = useInvalidateTeachers()
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch<Teacher>(`/teachers/${id}/status`, { is_active }),
    onSuccess: invalidate,
  })
}

export function useUploadTeacherPhoto() {
  const invalidate = useInvalidateTeachers()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const body = new FormData()
      body.append("photo", file)
      return api.post<Teacher>(`/teachers/${id}/photo`, body)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteTeacherPhoto() {
  const invalidate = useInvalidateTeachers()
  return useMutation({
    mutationFn: (id: string) => api.delete<Teacher>(`/teachers/${id}/photo`),
    onSuccess: invalidate,
  })
}

export function useResendTeacherCredentials() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<null>(`/teachers/${id}/resend-credentials`),
  })
}
