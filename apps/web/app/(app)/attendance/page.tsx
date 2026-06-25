"use client"

/**
 * Attendance surface (tasks 3.1–3.3). One route serves every audience:
 *
 *   - `?student={id}` → that student's monthly sheet. Reached from the student
 *     detail page (staff) and the parent's linked-children list. The API
 *     authorizes per record (staff / self / linked parent) and hides denials as
 *     404, so the route doesn't hard-gate on a permission here.
 *   - staff with `attendance.create`/`attendance.view` → the student entry +
 *     class-sheet hub.
 *   - teachers → their own check-in/out + history.
 *   - staff with teacher-attendance permissions → admin teacher records +
 *     correction.
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
import {
  TEACHER_ATTENDANCE_MANAGE,
  TEACHER_ATTENDANCE_VIEW,
  TeacherAttendanceAdmin,
  TeacherCheckinWidget,
} from "@/components/teacher-attendance"
import { EmptyState } from "@/components/empty-state"
import { usePermission } from "@/hooks/auth/use-permission"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

function AttendanceRouter() {
  const params = useSearchParams()
  const studentId = params.get("student")
  const teacherId = params.get("teacher")
  const canCreate = usePermission(ATTENDANCE_CREATE)
  const canView = usePermission(ATTENDANCE_VIEW)
  const canViewTeacherAttendance = usePermission(TEACHER_ATTENDANCE_VIEW)
  const canManageTeacherAttendance = usePermission(TEACHER_ATTENDANCE_MANAGE)
  const { roles } = useAuth()
  const isTeacher = roles.includes("teacher")

  if (studentId) {
    return <StudentAttendanceSheet studentId={studentId} />
  }

  const canUseStudentAttendance = canCreate || canView
  const canUseTeacherAdmin =
    canViewTeacherAttendance || canManageTeacherAttendance

  if (canUseStudentAttendance || isTeacher || canUseTeacherAdmin) {
    return (
      <AttendanceWorkspace
        canUseStudentAttendance={canUseStudentAttendance}
        canCreate={canCreate}
        canView={canView}
        canUseTeacherSelf={isTeacher}
        canUseTeacherAdmin={canUseTeacherAdmin}
        initialTeacherId={teacherId}
      />
    )
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

function AttendanceWorkspace({
  canUseStudentAttendance,
  canCreate,
  canView,
  canUseTeacherSelf,
  canUseTeacherAdmin,
  initialTeacherId,
}: {
  canUseStudentAttendance: boolean
  canCreate: boolean
  canView: boolean
  canUseTeacherSelf: boolean
  canUseTeacherAdmin: boolean
  initialTeacherId: string | null
}) {
  const surfaces: {
    key: string
    label: string
    content: React.ReactNode
  }[] = []

  if (canUseTeacherSelf) {
    surfaces.push({
      key: "my-teacher-attendance",
      label: "My attendance",
      content: <TeacherCheckinWidget />,
    })
  }

  if (canUseStudentAttendance) {
    surfaces.push({
      key: "student-attendance",
      label: "Student attendance",
      content: <AttendanceHub canCreate={canCreate} canView={canView} />,
    })
  }

  if (canUseTeacherAdmin) {
    surfaces.push({
      key: "teacher-records",
      label: "Teacher records",
      content: (
        <TeacherAttendanceAdmin
          key={initialTeacherId ?? "all-teachers"}
          initialTeacherId={initialTeacherId}
        />
      ),
    })
  }

  if (surfaces.length === 1) {
    return surfaces[0]!.content
  }

  const defaultValue =
    initialTeacherId && canUseTeacherAdmin ? "teacher-records" : surfaces[0]!.key

  return (
    <Tabs key={defaultValue} defaultValue={defaultValue} className="gap-6">
      <TabsList className="flex h-auto flex-wrap justify-start">
        {surfaces.map((surface) => (
          <TabsTrigger key={surface.key} value={surface.key}>
            {surface.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {surfaces.map((surface) => (
        <TabsContent key={surface.key} value={surface.key}>
          {surface.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default function AttendancePage() {
  return (
    <React.Suspense fallback={<AttendancePageFallback />}>
      <AttendanceRouter />
    </React.Suspense>
  )
}

function AttendancePageFallback() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
