"use client"

/**
 * Attendance surface (tasks 3.1–3.3). One route serves every audience:
 *
 *   - `?student={id}` → that student's monthly sheet. Reached from the student
 *     detail page and the admin parent detail (staff). The API authorizes per
 *     record (staff / self) and hides denials as 404, so the route doesn't
 *     hard-gate on a permission here.
 *   - staff with `attendance.create`/`attendance.view` → the student entry +
 *     class-sheet hub.
 *   - teachers → their own check-in/out + history.
 *   - staff with teacher-attendance permissions → admin teacher records +
 *     correction.
 *   - a student (no staff permissions) → their own self sheet.
 *   - a parent → no attendance route surface; they view each child's attendance
 *     from the student detail's Attendance tab (`/my-students/{id}`), so the
 *     route returns an access-denied state.
 *
 * Roles are used only to pick which self-service view to render — never to
 * grant access; the API stays the real boundary (`code-standards.md`). Students
 * and parents hold no permissions by design (RoleSeeder), so role is the only
 * signal available for that choice.
 */

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Lock } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import {
  ATTENDANCE_CREATE,
  ATTENDANCE_VIEW,
  AttendanceHub,
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

  // Parents have no attendance route surface — they view each child's
  // attendance inside the student detail's Attendance tab (`/my-students/{id}`),
  // not here. Deny the route outright (even a hand-typed `?student=`) so the
  // standalone attendance content never renders for them.
  if (roles.includes("parent")) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="View your child's attendance from their profile under Students."
      />
    )
  }

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
    <PersistentTabs
      param="tab"
      defaultValue={defaultValue}
      values={surfaces.map((s) => s.key)}
      className="gap-6"
    >
      <TabsList className="inline-flex h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-xl bg-subtle p-1">
        {surfaces.map((surface) => (
          <TabsTrigger
            key={surface.key}
            value={surface.key}
            className="h-9 flex-none rounded-lg px-4 text-sm font-medium text-copy-muted data-active:bg-surface data-active:text-copy-primary data-active:shadow-sm"
          >
            {surface.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {surfaces.map((surface) => (
        <TabsContent key={surface.key} value={surface.key}>
          {surface.content}
        </TabsContent>
      ))}
    </PersistentTabs>
  )
}

/**
 * Tabs whose active value is mirrored into a URL query param, so the selection
 * survives a page refresh (and is shareable). Falls back to `defaultValue` when
 * the param is absent or names a surface the current user can't see.
 */
function PersistentTabs({
  param,
  defaultValue,
  values,
  className,
  children,
}: {
  param: string
  defaultValue: string
  values: string[]
  className?: string
  children: React.ReactNode
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const fromUrl = params.get(param)
  const active = fromUrl && values.includes(fromUrl) ? fromUrl : defaultValue

  const onValueChange = (next: string) => {
    const search = new URLSearchParams(params.toString())
    search.set(param, next)
    router.replace(`${pathname}?${search.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={active} onValueChange={onValueChange} className={className}>
      {children}
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
