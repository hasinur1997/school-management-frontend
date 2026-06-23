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
 *
 * Layout follows the shared "detail" design kit (status-accented hero +
 * icon-headed info cards), matching the admission/teacher detail screens.
 */

import * as React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  CalendarCheck,
  FileText,
  GraduationCap,
  IdCard,
  ImageUp,
  MapPin,
  Pencil,
  Power,
  PowerOff,
  User,
  Users,
} from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
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
  const canManage = usePermission(STUDENT_UPDATE)

  if (isPending) {
    return (
      <DetailLayout>
        <DetailBackLink href="/students">Back to students</DetailBackLink>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <DetailLayout>
          <DetailBackLink href="/students">Back to students</DetailBackLink>
          <EmptyState
            title="Student not found"
            description="This student doesn't exist, isn't in your branch, or you don't have access."
            action={
              <Link href="/students">
                <Button>Back to students</Button>
              </Link>
            }
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <DetailBackLink href="/students">Back to students</DetailBackLink>
        <ErrorPanel description="We couldn't load this student." onRetry={() => void refetch()} />
      </DetailLayout>
    )
  }

  const tc = isTcStudent(student.status)
  const active = student.status === "active"
  const tone = tc ? "info" : active ? "success" : "error"

  const actions: DetailAction[] = [
    ...(canViewAttendance
      ? [
          {
            key: "attendance",
            label: "Attendance",
            icon: CalendarCheck,
            href: `/attendance?student=${student.id}`,
          },
        ]
      : []),
    ...(canViewResults
      ? [
          {
            key: "results",
            label: "Results",
            icon: FileText,
            href: `/results?student=${student.id}`,
          },
        ]
      : []),
    ...(canIdCard
      ? [
          {
            key: "idcard",
            label: "ID card",
            icon: IdCard,
            href: `/documents/id-cards?student=${student.id}`,
          },
        ]
      : []),
    ...(canViewTc
      ? [
          {
            key: "tc",
            label: "TC",
            icon: FileText,
            href: `/documents/transfer-certificates?student=${student.id}`,
          },
        ]
      : []),
    // TC students are retired — edit/photo/status are hidden for them.
    ...(!tc && canManage
      ? [
          {
            key: "photo",
            label: "Change photo",
            icon: ImageUp,
            onSelect: () => setPhotoOpen(true),
            separatorBefore:
              canViewAttendance || canViewResults || canIdCard || canViewTc,
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
    <DetailLayout>
      <DetailBackLink href="/students">Back to students</DetailBackLink>

      {/* TC notice */}
      {tc ? (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">
          <BadgeCheck className="size-4 shrink-0" aria-hidden />
          <span>
            This student has been issued a transfer certificate and is excluded
            from active operations.
          </span>
        </div>
      ) : null}

      <DetailHero
        tone={tone}
        statusLabel={studentStatusLabel(student.status)}
        photo={student.photo_url}
        initials={studentInitials(student)}
        title={studentDisplayName(student)}
        subtitle={
          <>
            {student.name_bn && student.name_en ? (
              <p className="text-[15px] text-copy-secondary">{student.name_bn}</p>
            ) : null}
            <p className="text-[13px] text-copy-muted">
              {student.admission_no ? `Admission ${student.admission_no}` : "Student"}
            </p>
          </>
        }
        actions={<DetailActions actions={actions} />}
        facts={[
          { label: "Admission no", value: student.admission_no, mono: true },
          {
            label: "Date of birth",
            value: student.date_of_birth ? formatDate(student.date_of_birth) : null,
          },
          { label: "Religion", value: student.religion },
          {
            label: "Admitted",
            value: student.admitted_at ? formatDate(student.admitted_at) : null,
          },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Identity */}
        <DetailCard icon={User} title="Student">
          <DetailRow label="Name (English)" value={student.name_en} />
          <DetailRow label="Name (Bangla)" value={student.name_bn} />
          <DetailRow label="Admission no" value={student.admission_no} mono />
          <DetailRow label="Birth registration no" value={student.birth_reg_no} mono />
          <DetailRow
            label="Date of birth"
            value={student.date_of_birth ? formatDate(student.date_of_birth) : null}
          />
          <DetailRow label="Religion" value={student.religion} />
          <DetailRow label="Nationality" value={student.nationality} />
          <DetailRow label="Caste" value={student.caste} />
          <DetailRow
            label="Admitted"
            value={student.admitted_at ? formatDate(student.admitted_at) : null}
          />
        </DetailCard>

        {/* Guardians */}
        <DetailCard icon={Users} title="Guardians">
          <DetailRow label="Father (English)" value={student.father_name_en} />
          <DetailRow label="Father (Bangla)" value={student.father_name_bn} />
          <DetailRow label="Father NID" value={student.father_nid} mono />
          <DetailRow label="Father mobile" value={student.father_mobile} mono />
          <DetailRow label="Mother (English)" value={student.mother_name_en} />
          <DetailRow label="Mother (Bangla)" value={student.mother_name_bn} />
          <DetailRow label="Mother NID" value={student.mother_nid} mono />
          <DetailRow label="Mother mobile" value={student.mother_mobile} mono />
        </DetailCard>

        {/* Present address */}
        <DetailCard icon={MapPin} title="Present address">
          <DetailRow label="Village / street" value={student.present_village} />
          <DetailRow label="Post office" value={student.present_post_office} />
          <DetailRow label="Upazila" value={student.present_upazila} />
          <DetailRow label="District" value={student.present_district} />
          <DetailRow label="Division" value={student.present_division} />
        </DetailCard>

        {/* Permanent address */}
        <DetailCard icon={MapPin} title="Permanent address">
          <DetailRow label="Village / street" value={student.permanent_village} />
          <DetailRow label="Post office" value={student.permanent_post_office} />
          <DetailRow label="Upazila" value={student.permanent_upazila} />
          <DetailRow label="District" value={student.permanent_district} />
          <DetailRow label="Division" value={student.permanent_division} />
        </DetailCard>
      </div>

      {/* Enrollment history */}
      <DetailCard
        icon={GraduationCap}
        title="Enrollment history"
        headerClassName="mb-[18px]"
        className="mt-5"
      >
        <StudentEnrollments id={student.id} />
      </DetailCard>

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
    </DetailLayout>
  )
}
