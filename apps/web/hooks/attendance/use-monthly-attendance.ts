"use client"

/**
 * Monthly attendance reads (task 3.2):
 *   - `useStudentMonthlyAttendance(id, {month, year})` → `GET /students/{id}/attendance`
 *     (staff, the student itself, or a linked parent — the API authorizes and
 *     hides denials as 404, like the student profile read);
 *   - `useMyMonthlyAttendance({month, year})` → `GET /me/attendance` (the
 *     authenticated student's own sheet; non-students get 403).
 *
 * Both return the API's pre-aggregated summary + day list; totals are never
 * recomputed client-side.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type {
  MonthlyAttendance,
  MonthlyAttendanceParams,
} from "@/types/attendance"

function monthParams({ month, year }: MonthlyAttendanceParams) {
  return { month, year }
}

export function useStudentMonthlyAttendance(
  studentId: string | null,
  params: MonthlyAttendanceParams
) {
  return useQuery({
    queryKey: queryKey("attendance", "student-month", {
      student: studentId,
      ...monthParams(params),
    }),
    queryFn: () =>
      api.get<MonthlyAttendance>(`/students/${studentId}/attendance`, {
        params: monthParams(params),
      }),
    enabled: Boolean(studentId),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useMyMonthlyAttendance(params: MonthlyAttendanceParams) {
  return useQuery({
    queryKey: queryKey("attendance", "me-month", monthParams(params)),
    queryFn: () =>
      api.get<MonthlyAttendance>("/me/attendance", { params: monthParams(params) }),
    staleTime: STALE_TIME.SHORT,
  })
}
