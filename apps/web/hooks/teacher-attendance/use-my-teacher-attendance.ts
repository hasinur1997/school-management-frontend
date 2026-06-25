"use client"

/**
 * The authenticated teacher's own attendance (task 3.3):
 *   - `useMyTeacherAttendance({month, year})` → `GET /me/teacher-attendance`,
 *     returning the API's status summary plus the month's records (totals are
 *     never recomputed client-side).
 *   - `useCheckIn()` / `useCheckOut()` → `POST /teacher-attendance/check-{in,out}`.
 *     The API validates the request IP against the branch whitelist; the UI only
 *     triggers and surfaces the result. Both invalidate the module + dashboard so
 *     today's status reloads from the server.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type {
  MyTeacherAttendance,
  TeacherAttendanceMonthParams,
  TeacherAttendanceRecord,
} from "@/types/teacher-attendance"

export function useMyTeacherAttendance({
  month,
  year,
}: TeacherAttendanceMonthParams) {
  return useQuery({
    queryKey: queryKey("teacher-attendance", "me", { month, year }),
    queryFn: () =>
      api.get<MyTeacherAttendance>("/me/teacher-attendance", {
        params: { month, year },
      }),
    staleTime: STALE_TIME.SHORT,
  })
}

function useInvalidateTeacherAttendance() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }
}

export function useCheckIn() {
  const invalidate = useInvalidateTeacherAttendance()
  return useMutation({
    mutationFn: () =>
      api.post<TeacherAttendanceRecord>("/teacher-attendance/check-in"),
    onSuccess: invalidate,
  })
}

export function useCheckOut() {
  const invalidate = useInvalidateTeacherAttendance()
  return useMutation({
    mutationFn: () =>
      api.post<TeacherAttendanceRecord>("/teacher-attendance/check-out"),
    onSuccess: invalidate,
  })
}
