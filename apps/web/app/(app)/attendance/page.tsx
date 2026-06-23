"use client"

/**
 * Student attendance entry route (task 3.1). The real backend gates
 * `GET /attendance/sheet` and `POST /attendance` on `attendance.create`, so the
 * route checks that slug before rendering the entry UI. Read-only attendance
 * sheets are added in task 3.2.
 */

import { Lock } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import {
  ATTENDANCE_CREATE,
  StudentAttendanceEntry,
} from "@/components/attendance"
import { usePermission } from "@/hooks/auth/use-permission"

export default function AttendancePage() {
  const canCreate = usePermission(ATTENDANCE_CREATE)

  if (!canCreate) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to record student attendance."
      />
    )
  }

  return <StudentAttendanceEntry />
}
