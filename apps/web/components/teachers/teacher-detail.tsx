"use client"

/**
 * Teacher detail / profile (task 2.4): identity + contact, class/subject
 * assignments, an attendance-summary link, and the manage actions (edit, change
 * photo, toggle status, resend credentials). Reads `useTeacher`; writes
 * invalidate the cache so the view refreshes. Owns loading / not-found / error /
 * loaded states; an out-of-branch or missing record surfaces as not-found.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarCheck,
  ImageUp,
  Mail,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button, buttonVariants } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { DetailSkeleton } from "@/components/skeletons"
import { usePermission } from "@/hooks/auth/use-permission"
import { isNotFoundError } from "@/lib/api"
import { cn } from "@workspace/ui/lib/utils"
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

const EMPTY = "—"

export function TeacherDetail({ id }: { id: string }) {
  const { data: teacher, isPending, isError, error, refetch } = useTeacher(id)
  const toggleStatus = useToggleTeacherStatus()
  const resendCredentials = useResendTeacherCredentials()

  const [editOpen, setEditOpen] = React.useState(false)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [resendOpen, setResendOpen] = React.useState(false)

  const canViewAttendance = usePermission("attendance.view")

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <DetailSkeleton />
      </div>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <div className="flex flex-col gap-6">
          <BackLink />
          <EmptyState
            title="Teacher not found"
            description="This teacher doesn't exist or isn't in your branch."
            action={
              <Link href="/teachers" className={cn(buttonVariants())}>
                Back to teachers
              </Link>
            }
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <ErrorPanel
          description="We couldn't load this teacher."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const active = isTeacherActive(teacher)
  const assignments = teacher.assignments ?? []

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
    <div className="flex flex-col gap-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="size-28 shrink-0">
            {teacher.photo_url ? (
              <AvatarImage src={teacher.photo_url} alt="" />
            ) : null}
            <AvatarFallback>{teacherInitials(teacher)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-copy-primary">
                {teacherDisplayName(teacher)}
              </h1>
              <StatusBadge status={active ? "Active" : "Inactive"} />
            </div>
            <p className="truncate text-sm text-copy-muted">
              {teacher.designation || "Teacher"}
              {teacher.employee_id ? ` · ${teacher.employee_id}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canViewAttendance ? (
            <Link
              href={`/attendance?teacher=${teacher.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <CalendarCheck className="size-4" aria-hidden />
              Attendance
            </Link>
          ) : null}
          <Can permission={TEACHER_MANAGE}>
            <Button variant="outline" onClick={() => setPhotoOpen(true)}>
              <ImageUp className="size-4" aria-hidden />
              Photo
            </Button>
            <Button variant="outline" onClick={() => setResendOpen(true)}>
              <Mail className="size-4" aria-hidden />
              Resend
            </Button>
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              {active ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {active ? "Deactivate" : "Activate"}
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6">
          <h2 className="text-base font-semibold text-copy-primary">Profile</h2>
          <dl className="flex flex-col divide-y divide-surface-border">
            <Field label="Email" value={teacher.email} />
            <Field label="Phone" value={teacher.phone} />
            <Field label="Employee ID" value={teacher.employee_id} />
            <Field label="Designation" value={teacher.designation} />
            <Field
              label="Gender"
              value={teacher.gender}
              className="capitalize"
            />
            <Field label="Address" value={teacher.address} />
            <Field
              label="Joined"
              value={teacher.joining_date ? formatDate(teacher.joining_date) : null}
            />
          </dl>
        </section>

        {/* Assignments */}
        <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6">
          <h2 className="text-base font-semibold text-copy-primary">
            Assignments
          </h2>
          {assignments.length === 0 ? (
            <EmptyState
              title="No assignments"
              description="This teacher isn't assigned to any class yet."
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {assignments.map((a, i) => {
                const labels = assignmentSummaryLabels(a)
                return (
                <li
                  key={a.id ?? i}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-surface-border bg-base/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-copy-primary">
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
                    />
                  ) : (
                    <StatusBadge status="Class teacher" tone="neutral" />
                  )}
                </li>
                )
              })}
            </ul>
          )}
        </section>
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
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/teachers"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-copy-muted hover:text-copy-primary"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to teachers
    </Link>
  )
}

function Field({
  label,
  value,
  className,
}: {
  label: string
  value?: string | null
  className?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-copy-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm text-copy-secondary",
          className
        )}
      >
        {value || EMPTY}
      </dd>
    </div>
  )
}
