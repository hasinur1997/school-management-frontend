"use client"

/**
 * Teacher detail / profile (task 2.4): identity + contact, class/subject
 * assignments, an attendance-summary link, and the manage actions (edit, change
 * photo, toggle status, resend credentials). Reads `useTeacher`; writes
 * invalidate the cache so the view refreshes. Owns loading / not-found / error /
 * loaded states; an out-of-branch or missing record surfaces as not-found.
 *
 * Layout follows the shared "detail" design kit (status-accented hero +
 * icon-headed info cards), matching the admission/student detail screens.
 */

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  CalendarCheck,
  ImageUp,
  Mail,
  Pencil,
  Power,
  PowerOff,
  User,
} from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { DetailSkeleton } from "@/components/skeletons"
import {
  DetailActions,
  DetailBackLink,
  DetailCard,
  DetailHero,
  DetailLayout,
  DetailRow,
  type DetailAction,
} from "@/components/detail/detail-ui"
import { usePermission } from "@/hooks/auth/use-permission"
import { isNotFoundError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useTeacher,
  useToggleTeacherStatus,
  useResendTeacherCredentials,
} from "@/hooks/teachers"
import {
  assignmentSummaryLabels,
  isTeacherActive,
  teacherDisplayName,
  teacherInitials,
} from "@/types/teacher"
import { TEACHER_MANAGE } from "./permissions"
import { TeacherFormDialog } from "./teacher-form-dialog"
import { TeacherPhotoDialog } from "./teacher-photo-dialog"
import { ConfirmDialog } from "./confirm-dialog"

export function TeacherDetail({ id }: { id: string }) {
  const { data: teacher, isPending, isError, error, refetch } = useTeacher(id)
  const toggleStatus = useToggleTeacherStatus()
  const resendCredentials = useResendTeacherCredentials()

  const [editOpen, setEditOpen] = React.useState(false)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [resendOpen, setResendOpen] = React.useState(false)

  const canViewAttendance = usePermission("attendance.view")
  const canManage = usePermission(TEACHER_MANAGE)

  if (isPending) {
    return (
      <DetailLayout>
        <DetailBackLink href="/teachers">Back to teachers</DetailBackLink>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <DetailLayout>
          <DetailBackLink href="/teachers">Back to teachers</DetailBackLink>
          <EmptyState
            title="Teacher not found"
            description="This teacher doesn't exist or isn't in your branch."
            action={
              <Link href="/teachers">
                <Button>Back to teachers</Button>
              </Link>
            }
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <DetailBackLink href="/teachers">Back to teachers</DetailBackLink>
        <ErrorPanel
          description="We couldn't load this teacher."
          onRetry={() => void refetch()}
        />
      </DetailLayout>
    )
  }

  const active = isTeacherActive(teacher)
  const assignments = teacher.assignments ?? []

  const actions: DetailAction[] = [
    ...(canViewAttendance
      ? [
          {
            key: "attendance",
            label: "Attendance",
            icon: CalendarCheck,
            href: `/attendance?teacher=${teacher.id}`,
          },
        ]
      : []),
    ...(canManage
      ? [
          {
            key: "photo",
            label: "Change photo",
            icon: ImageUp,
            onSelect: () => setPhotoOpen(true),
            separatorBefore: canViewAttendance,
          },
          {
            key: "resend",
            label: "Resend credentials",
            icon: Mail,
            onSelect: () => setResendOpen(true),
          },
          {
            key: "status",
            label: active ? "Deactivate" : "Activate",
            icon: active ? PowerOff : Power,
            onSelect: () => setStatusOpen(true),
            destructive: active,
            separatorBefore: true,
          },
          {
            key: "edit",
            label: "Edit",
            icon: Pencil,
            onSelect: () => setEditOpen(true),
            primary: true,
          },
        ]
      : []),
  ]

  async function confirmToggleStatus() {
    try {
      await toggleStatus.mutateAsync({ id, is_active: !active })
      toastSuccess(active ? "Teacher deactivated." : "Teacher activated.", {
        id: "teacher-status",
      })
      setStatusOpen(false)
    } catch (err) {
      toastError(err, "Couldn't update the status.", { id: "teacher-status" })
      throw err
    }
  }

  async function confirmResend() {
    try {
      await resendCredentials.mutateAsync(id)
      toastSuccess("Login credentials resent.", { id: "teacher-resend" })
      setResendOpen(false)
    } catch (err) {
      toastError(err, "Couldn't resend credentials.", { id: "teacher-resend" })
      throw err
    }
  }

  return (
    <DetailLayout>
      <DetailBackLink href="/teachers">Back to teachers</DetailBackLink>

      <DetailHero
        tone={active ? "success" : "error"}
        statusLabel={active ? "Active" : "Inactive"}
        photo={teacher.photo_url}
        initials={teacherInitials(teacher)}
        title={teacherDisplayName(teacher)}
        subtitle={
          <p className="text-[15px] text-copy-secondary">
            {teacher.designation || "Teacher"}
            {teacher.employee_id ? ` · ${teacher.employee_id}` : ""}
          </p>
        }
        actions={<DetailActions actions={actions} />}
        facts={[
          { label: "Employee ID", value: teacher.employee_id, mono: true },
          { label: "Designation", value: teacher.designation },
          { label: "Phone", value: teacher.phone, mono: true },
          {
            label: "Joined",
            value: teacher.joining_date ? formatDate(teacher.joining_date) : null,
          },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Profile */}
        <DetailCard icon={User} title="Profile">
          <DetailRow label="Email" value={teacher.email} />
          <DetailRow label="Phone" value={teacher.phone} mono />
          <DetailRow label="Employee ID" value={teacher.employee_id} mono />
          <DetailRow label="Designation" value={teacher.designation} />
          <DetailRow
            label="Gender"
            value={teacher.gender}
            valueClassName="capitalize"
          />
          <DetailRow label="Address" value={teacher.address} />
          <DetailRow
            label="Joined"
            value={teacher.joining_date ? formatDate(teacher.joining_date) : null}
          />
        </DetailCard>

        {/* Assignments */}
        <DetailCard icon={BookOpen} title="Assignments" headerClassName="mb-3">
          {assignments.length === 0 ? (
            <EmptyState
              title="No assignments"
              description="This teacher isn't assigned to any class yet."
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {assignments.map((a, i) => {
                const labels = assignmentSummaryLabels(a)
                return (
                  <li
                    key={a.id ?? i}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-surface-border bg-base px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-copy-primary">
                      {labels.class}
                    </span>
                    {labels.section ? (
                      <span className="text-copy-muted">· {labels.section}</span>
                    ) : null}
                    {labels.subject ? (
                      <StatusBadge
                        status="Subject"
                        tone="info"
                        label={labels.subject}
                        className="ml-auto"
                      />
                    ) : (
                      <StatusBadge
                        status="Class teacher"
                        tone="neutral"
                        className="ml-auto"
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </DetailCard>
      </div>

      <TeacherFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={teacher}
      />
      <TeacherPhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        teacher={teacher}
      />
      <ConfirmDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={active ? "Deactivate teacher" : "Activate teacher"}
        description={
          <>
            {active ? "Deactivate " : "Activate "}
            <span className="font-medium">{teacherDisplayName(teacher)}</span>?{" "}
            {active
              ? "They will lose access until reactivated."
              : "They will regain access."}
          </>
        }
        confirmLabel={active ? "Deactivate" : "Activate"}
        pendingLabel="Updating…"
        onConfirm={confirmToggleStatus}
      />
      <ConfirmDialog
        open={resendOpen}
        onOpenChange={setResendOpen}
        title="Resend credentials"
        description={
          <>
            Generate and email fresh login credentials to{" "}
            <span className="font-medium">{teacherDisplayName(teacher)}</span>
            {teacher.email ? ` (${teacher.email})` : ""}?
          </>
        }
        confirmLabel="Resend"
        pendingLabel="Sending…"
        onConfirm={confirmResend}
      />
    </DetailLayout>
  )
}
