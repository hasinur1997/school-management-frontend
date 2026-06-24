"use client"

/**
 * Attendance surface (tasks 3.1–3.2). One route serves every audience:
 *
 *   - `?student={id}` → that student's monthly sheet. Reached from the student
 *     detail page (staff) and the parent's linked-children list. The API
 *     authorizes per record (staff / self / linked parent) and hides denials as
 *     404, so the route doesn't hard-gate on a permission here.
 *   - staff with `attendance.create`/`attendance.view` → the entry + class-sheet
 *     hub.
 *   - a parent (no staff permissions) → child selector + per-child sheet.
 *   - a student (no staff permissions) → their own self sheet.
 *
 * Roles are used only to pick which self-service view to render — never to
 * grant access; the API stays the real boundary (`code-standards.md`). Students
 * and parents hold no permissions by design (RoleSeeder), so role is the only
 * signal available for that choice.
 */

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Lock } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import {
  ATTENDANCE_CREATE,
  ATTENDANCE_VIEW,
  AttendanceHub,
  ParentAttendance,
  SelfAttendance,
  StudentAttendanceSheet,
} from "@/components/attendance"
import { EmptyState } from "@/components/empty-state"
import { usePermission } from "@/hooks/auth/use-permission"

function AttendanceRouter() {
  const params = useSearchParams()
  const studentId = params.get("student")
  const canCreate = usePermission(ATTENDANCE_CREATE)
  const canView = usePermission(ATTENDANCE_VIEW)
  const { roles } = useAuth()

  if (studentId) {
    return <StudentAttendanceSheet studentId={studentId} />
  }

  if (canCreate || canView) {
    return <AttendanceHub canCreate={canCreate} canView={canView} />
  }

  if (roles.includes("parent")) {
    return <ParentAttendance />
  }

  if (roles.includes("student")) {
    return <SelfAttendance />
  }

  return (
    <EmptyState
      icon={Lock}
      title="You don't have access"
      description="You don't have permission to view attendance."
    />
  )
}

export default function AttendancePage() {
  return (
    <React.Suspense fallback={null}>
      <AttendanceRouter />
    </React.Suspense>
  )
}
