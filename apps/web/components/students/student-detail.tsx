"use client"

/**
 * Student detail / profile (task 2.7): bilingual identity, guardian/parent info,
 * address, enrollment history (dedicated endpoint), and links into
 * attendance/results/ID-card/TC. Manage actions (edit, photo, status toggle) are
 * gated by `student.update` and hidden for TC students (a TC student is retired —
 * status is issued via the Documents/TC module, not flipped here).
 *
 * Reads `useStudent`; an out-of-branch, missing, or access-denied record
 * surfaces as not-found (the API hides it as `404`, never `403`). TC students are
 * flagged with an info badge; the status is reflected, never special-cased.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  FileText,
  IdCard,
  ImageUp,
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
import { useStudent, useUpdateStudentStatus } from "@/hooks/students"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import {
  isTcStudent,
  studentDisplayName,
  studentInitials,
  studentStatusLabel,
} from "@/types/student"
import { STUDENT_UPDATE } from "./permissions"
import { StudentFormDialog } from "./student-form-dialog"
import { StudentPhotoDialog } from "./student-photo-dialog"
import { StudentEnrollments } from "./student-enrollments"

const EMPTY = "—"

export function StudentDetail({ id }: { id: string }) {
  const { data: student, isPending, isError, error, refetch } = useStudent(id)
  const updateStatus = useUpdateStudentStatus()

  const [editOpen, setEditOpen] = React.useState(false)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)

  const canViewAttendance = usePermission("attendance.view")
  const canViewResults = usePermission("result.view")
  const canIdCard = usePermission("idcard.generate")
  const canViewTc = usePermission("tc.view")

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
            title="Student not found"
            description="This student doesn't exist, isn't in your branch, or you don't have access."
            action={
              <Link href="/students" className={cn(buttonVariants())}>
                Back to students
              </Link>
            }
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <ErrorPanel description="We couldn't load this student." onRetry={() => void refetch()} />
      </div>
    )
  }

  const tc = isTcStudent(student.status)
  const active = student.status === "active"

  async function confirmToggleStatus() {
    try {
      await updateStatus.mutateAsync({ id, status: active ? "inactive" : "active" })
      toastSuccess(active ? "Student deactivated." : "Student activated.", {
        id: "student-status",
      })
      setStatusOpen(false)
    } catch (err) {
      toastError(err, "Couldn't update the status.", { id: "student-status" })
      throw err
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      {/* TC notice */}
      {tc ? (
        <div className="flex items-center gap-2 rounded-xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">
          <BadgeCheck className="size-4 shrink-0" aria-hidden />
          <span>
            This student has been issued a transfer certificate and is excluded
            from active operations.
          </span>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="size-28 shrink-0">
            {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
            <AvatarFallback>{studentInitials(student)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-copy-primary">
                {studentDisplayName(student)}
              </h1>
              <StatusBadge
                status={student.status}
                label={studentStatusLabel(student.status)}
              />
            </div>
            {student.name_bn && student.name_en ? (
              <p className="truncate text-sm text-copy-secondary">{student.name_bn}</p>
            ) : null}
            <p className="truncate text-sm text-copy-muted">
              {student.admission_no ? `Admission ${student.admission_no}` : "Student"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canViewAttendance ? (
            <Link
              href={`/attendance?student=${student.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <CalendarCheck className="size-4" aria-hidden />
              Attendance
            </Link>
          ) : null}
          {canViewResults ? (
            <Link
              href={`/results?student=${student.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <FileText className="size-4" aria-hidden />
              Results
            </Link>
          ) : null}
          {canIdCard ? (
            <Link
              href={`/documents/id-cards?student=${student.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <IdCard className="size-4" aria-hidden />
              ID card
            </Link>
          ) : null}
          {canViewTc ? (
            <Link
              href={`/documents/transfer-certificates?student=${student.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <FileText className="size-4" aria-hidden />
              TC
            </Link>
          ) : null}
          {/* TC students are retired — edit/photo/status are hidden for them. */}
          {!tc ? (
            <Can permission={STUDENT_UPDATE}>
              <Button variant="outline" onClick={() => setPhotoOpen(true)}>
                <ImageUp className="size-4" aria-hidden />
                Photo
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
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Identity */}
        <Section title="Student">
          <Field label="Name (English)" value={student.name_en} />
          <Field label="Name (Bangla)" value={student.name_bn} />
          <Field label="Admission no" value={student.admission_no} />
          <Field label="Birth registration no" value={student.birth_reg_no} />
          <Field
            label="Date of birth"
            value={student.date_of_birth ? formatDate(student.date_of_birth) : null}
          />
          <Field label="Religion" value={student.religion} />
          <Field label="Nationality" value={student.nationality} />
          <Field label="Caste" value={student.caste} />
          <Field
            label="Admitted"
            value={student.admitted_at ? formatDate(student.admitted_at) : null}
          />
        </Section>

        {/* Guardians */}
        <Section title="Guardians">
          <Field label="Father (English)" value={student.father_name_en} />
          <Field label="Father (Bangla)" value={student.father_name_bn} />
          <Field label="Father NID" value={student.father_nid} />
          <Field label="Father mobile" value={student.father_mobile} />
          <Field label="Mother (English)" value={student.mother_name_en} />
          <Field label="Mother (Bangla)" value={student.mother_name_bn} />
          <Field label="Mother NID" value={student.mother_nid} />
          <Field label="Mother mobile" value={student.mother_mobile} />
        </Section>

        {/* Present address */}
        <Section title="Present address">
          <Field label="Village / street" value={student.present_village} />
          <Field label="Post office" value={student.present_post_office} />
          <Field label="Upazila" value={student.present_upazila} />
          <Field label="District" value={student.present_district} />
          <Field label="Division" value={student.present_division} />
        </Section>

        {/* Permanent address */}
        <Section title="Permanent address">
          <Field label="Village / street" value={student.permanent_village} />
          <Field label="Post office" value={student.permanent_post_office} />
          <Field label="Upazila" value={student.permanent_upazila} />
          <Field label="District" value={student.permanent_district} />
          <Field label="Division" value={student.permanent_division} />
        </Section>
      </div>

      {/* Enrollment history */}
      <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-copy-primary">Enrollment history</h2>
        <StudentEnrollments id={student.id} />
      </section>

      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student} />
      <StudentPhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} student={student} />
      <ConfirmDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={active ? "Deactivate student" : "Activate student"}
        description={
          <>
            {active ? "Deactivate " : "Activate "}
            <span className="font-medium">{studentDisplayName(student)}</span>?
          </>
        }
        confirmLabel={active ? "Deactivate" : "Activate"}
        pendingLabel="Updating…"
        onConfirm={confirmToggleStatus}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/students"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-copy-muted hover:text-copy-primary"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to students
    </Link>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold text-copy-primary">{title}</h2>
      <dl className="flex flex-col divide-y divide-surface-border">{children}</dl>
    </section>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-copy-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-copy-secondary">{value || EMPTY}</dd>
    </div>
  )
}
