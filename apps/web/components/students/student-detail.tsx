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
 * icon-headed info cards), matching the admission/teacher detail screens. Below
 * the hero, a URL-persisted tab strip switches between Profile, Attendance,
 * Results, ID card, and TC; manage actions (edit, photo, status) stay in the
 * hero rather than the tab strip.
 */

import * as React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  CalendarCheck,
  CalendarOff,
  FileText,
  GraduationCap,
  IdCard,
  ImageUp,
  MapPin,
  Pencil,
  Power,
  PowerOff,
  ScrollText,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { StudentAttendancePanel } from "@/components/attendance/student-attendance-panel"
import {
  DetailActions,
  DetailBackLink,
  DetailCard,
  DetailHero,
  DetailLayout,
  DetailRow,
  type DetailAction,
} from "@/components/detail/detail-ui"
import {
  DetailTabs,
  useDetailTab,
  type DetailTab,
} from "@/components/detail/detail-tabs"
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
  const canViewFees = usePermission("invoice.view")
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

  // Class / section / roll come from the current enrollment (the active one, or
  // the most recent the API returns first) — mirrors the attendance hero.
  const currentEnrollment =
    student.enrollments?.find((e) => e.status === "active") ??
    student.enrollments?.[0] ??
    null
  const tone = tc ? "info" : active ? "success" : "error"

  // Manage actions live in the hero (Change photo / Deactivate / Edit). The
  // section-switching items (Attendance, Results, …) are tabs below the hero,
  // not hero actions. TC students are retired — manage actions are hidden.
  const actions: DetailAction[] = [
    ...(!tc && canManage
      ? [
          {
            key: "photo",
            label: "Change photo",
            icon: ImageUp,
            onSelect: () => setPhotoOpen(true),
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

  // View tabs: Profile is always present and the default; the rest are gated by
  // permission. The active tab is read from `?tab=` so a refresh keeps it.
  const tabs: DetailTab[] = [
    { key: "profile", label: "Profile", icon: User },
    ...(canViewAttendance
      ? [{ key: "attendance", label: "Attendance", icon: CalendarCheck }]
      : []),
    ...(canViewResults
      ? [{ key: "results", label: "Results", icon: FileText }]
      : []),
    ...(canViewAttendance
      ? [{ key: "leaves", label: "Leaves", icon: CalendarOff }]
      : []),
    ...(canViewFees
      ? [{ key: "fees", label: "Tuition fees", icon: Wallet }]
      : []),
    ...(canIdCard ? [{ key: "idcard", label: "ID card", icon: IdCard }] : []),
    ...(canViewTc ? [{ key: "tc", label: "TC", icon: ScrollText }] : []),
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
              {student.branch?.name ?? "Student"}
            </p>
          </>
        }
        actions={<DetailActions actions={actions} />}
        facts={[
          { label: "Class", value: currentEnrollment?.class?.name },
          { label: "Section", value: currentEnrollment?.section?.name },
          {
            label: "Roll no",
            value:
              currentEnrollment?.roll_no != null
                ? String(currentEnrollment.roll_no)
                : null,
            mono: true,
          },
          {
            label: "Admitted",
            value: student.admitted_at ? formatDate(student.admitted_at) : null,
          },
        ]}
      />

      <React.Suspense fallback={<DetailSkeleton />}>
        <StudentDetailTabs tabs={tabs} student={student} />
      </React.Suspense>

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

type Student = NonNullable<ReturnType<typeof useStudent>["data"]>

/**
 * The tab strip + active panel below the hero. Split out so the `useDetailTab`
 * (`useSearchParams`) read sits behind its own Suspense boundary, keeping the
 * URL-driven active tab from opting the whole route out of static rendering.
 */
function StudentDetailTabs({
  tabs,
  student,
}: {
  tabs: DetailTab[]
  student: Student
}) {
  const { active, setActive } = useDetailTab(tabs)

  return (
    <div>
      <DetailTabs tabs={tabs} active={active} onChange={setActive} />

      {active === "profile" ? (
        <StudentProfilePanel student={student} />
      ) : active === "attendance" ? (
        <StudentAttendancePanel studentId={student.id} />
      ) : active === "results" ? (
        <ComingSoonPanel
          icon={FileText}
          title="Results aren't available yet"
          description="This student's exam results will appear here once the results module is live."
        />
      ) : active === "leaves" ? (
        <ComingSoonPanel
          icon={CalendarOff}
          title="Leaves aren't available yet"
          description="This student's leave applications and approvals will appear here once the leaves module is live."
        />
      ) : active === "fees" ? (
        <ComingSoonPanel
          icon={Wallet}
          title="Tuition fees aren't available yet"
          description="This student's invoices and fee payments will appear here once the finance module is live."
        />
      ) : active === "idcard" ? (
        <ComingSoonPanel
          icon={IdCard}
          title="ID cards aren't available yet"
          description="Generate and download this student's ID card here once the documents module is live."
        />
      ) : active === "tc" ? (
        <ComingSoonPanel
          icon={ScrollText}
          title="Transfer certificates aren't available yet"
          description="Issue and view this student's transfer certificate here once the documents module is live."
        />
      ) : null}
    </div>
  )
}

/** The default "Profile" tab: identity, guardians, addresses, enrollments. */
function StudentProfilePanel({ student }: { student: Student }) {
  return (
    <div>
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
    </div>
  )
}

/**
 * Placeholder for view tabs whose backing module (results, ID cards, TCs) isn't
 * built yet — keeps the tabbed experience consistent instead of routing to a
 * dead link, and is swapped for the real panel when each module lands.
 */
function ComingSoonPanel({
  icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return <EmptyState icon={icon} title={title} description={description} />
}
