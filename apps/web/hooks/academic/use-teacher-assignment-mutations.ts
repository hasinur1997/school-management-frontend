"use client"

/**
 * Teacher-assignment write mutations (task 2.3) — `POST /teacher-assignments`,
 * `PUT /teacher-assignments/{id}`, `DELETE /teacher-assignments/{id}`.
 *
 * Each invalidates the `["teacher-assignments"]` key so every filtered list
 * refetches after a write. The API is authoritative on validation (`422` →
 * field errors at the form) and scoping (`branch_id` via the interceptor).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { TeacherAssignment } from "@/types/academic"

/** Create/edit payload for a teacher assignment. */
export interface TeacherAssignmentInput {
  teacher_id: number
  class_id: number
  /** Required — assignments are scoped to an academic session. */
  session_id: number
  /** Optional — a class-teacher assignment may have no section. */
  section_id?: number | null
  /** Optional — absent marks a class-teacher (vs subject-teacher) assignment. */
  subject_id?: number | null
}

export function useCreateTeacherAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TeacherAssignmentInput) =>
      api.post<TeacherAssignment>("/teacher-assignments", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
    },
  })
}

export function useUpdateTeacherAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: TeacherAssignmentInput & { id: number }) =>
      api.put<TeacherAssignment>(`/teacher-assignments/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
    },
  })
}

export function useDeleteTeacherAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<null>(`/teacher-assignments/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
    },
  })
}
