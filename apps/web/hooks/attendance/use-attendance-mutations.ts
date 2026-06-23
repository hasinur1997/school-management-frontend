"use client"

/**
 * Student attendance mutations (task 3.1):
 *   - `POST /attendance` bulk-upserts one section/date roster
 *   - `PUT  /attendance/{id}` corrects one existing attendance record
 *
 * The API owns idempotency, assignment checks, TC/inactive exclusion, and
 * branch scoping. Mutations invalidate the attendance module and dashboard
 * figures so re-entering the same date reloads the server's current marks.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  AttendanceBulkInput,
  AttendanceBulkResult,
  AttendanceRecord,
  AttendanceStatusValue,
} from "@/types/attendance"

function useInvalidateAttendance() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["attendance"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }
}

export function useSaveAttendance() {
  const invalidate = useInvalidateAttendance()
  return useMutation({
    mutationFn: (input: AttendanceBulkInput) =>
      api.post<AttendanceBulkResult>("/attendance", input),
    onSuccess: invalidate,
  })
}

export function useUpdateAttendanceRecord() {
  const invalidate = useInvalidateAttendance()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: AttendanceStatusValue
    }) => api.put<AttendanceRecord>(`/attendance/${id}`, { status }),
    onSuccess: invalidate,
  })
}
