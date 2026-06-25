"use client"

/**
 * `useCorrectTeacherAttendance()` — admin correction
 * `PUT /teacher-attendance/{id}` (task 3.3). The API records `corrected_by`
 * server-side and validates check-out order. Success invalidates the module so
 * the browse table reloads the corrected record.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  TeacherAttendanceCorrectionInput,
  TeacherAttendanceRecord,
} from "@/types/teacher-attendance"

export function useCorrectTeacherAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & TeacherAttendanceCorrectionInput) =>
      api.put<TeacherAttendanceRecord>(`/teacher-attendance/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
    },
  })
}
