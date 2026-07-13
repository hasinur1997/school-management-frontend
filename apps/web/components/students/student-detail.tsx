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
import { useRouter, usePathname } from "next/navigation"
import {
  BadgeCheck,
  CalendarCheck,
  CalendarOff,
  FileText,
  GraduationCap,
  IdCard,
  ArrowUpCircle,
  ImageUp,
  Mail,
  Power,
  PowerOff,
  ScrollText,
  Trash2,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { StudentAttendancePanel } from "@/components/attendance/student-attendance-panel"
import { EnrollmentResultsPanel } from "@/components/results"
import { StudentInvoicesPanel } from "@/components/invoices"
import { IdCardPanel, StudentTcPanel } from "@/components/documents"
import { PromoteStudentDialog } from "@/components/promotions/promote-student-dialog"
import { PROMOTION_EXECUTE } from "@/components/promotions/permissions"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import {
  DetailActions,
  DetailBackLink,
  DetailCard,
  DetailHero,
  DetailLayout,
  type DetailAction,
} from "@/components/detail/detail-ui"
import {
  DetailTabs,
  useDetailTab,
  type DetailTab,
} from "@/components/detail/detail-tabs"
import { usePermission } from "@/hooks/auth/use-permission"
import { useAuth } from "@/components/auth/auth-provider"
import { isNotFoundError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useStudent,
  useDeleteStudent,
  useUpdateStudentStatus,
  useResendStudentCredentials,
} from "@/hooks/students"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import {
  isTcStudent,
  studentDisplayName,
  studentInitials,
  studentStatusLabel,
} from "@/types/student"
import { STUDENT_CREATE, STUDENT_DELETE, STUDENT_UPDATE } from "./permissions"
import { StudentPhotoDialog } from "./student-photo-dialog"
import { StudentEnrollments } from "./student-enrollments"
import {
  StudentAddressCards,
  StudentGuardiansCard,
  StudentIdentityCard,
} from "./student-profile-cards"

export function StudentDetail({
  id,
  backHref = "/students",
  backLabel = "Back to students",
}: {
  id: string
  /** Where the back link points — parents return to `/my-students`. */
  backHref?: string
  backLabel?: string
}) {
  const router = useRouter()
  const { roles } = useAuth()
  const { data: student, isPending, isError, error, refetch } = useStudent(id)
  const updateStatus = useUpdateStudentStatus()
  const resendCredentials = useResendStudentCredentials()
  const deleteStudent = useDeleteStudent()

  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [resendOpen, setResendOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [promoteOpen, setPromoteOpen] = React.useState(false)

  // Linked parents reach this detail via `/me/students`; they hold no staff
  // permissions, so the section tabs are exposed by role instead (the API
  // authorizes each child resource for the linked parent). Edit actions stay
  // permission-led, so the profile remains read-only for them.
  const isParent = roles.includes("parent")
  const canViewAttendance = usePermission("attendance.view") || isParent
  const canViewResults = usePermission("result.view") || isParent
  const canIdCard = usePermission("idcard.generate") || isParent
  const canViewTc = usePermission("tc.view") || isParent
  const canViewFees = usePermission("invoice.view") || isParent
  const canManage = usePermission(STUDENT_UPDATE)
  const canResend = usePermission(STUDENT_CREATE)
  const canDelete = usePermission(STUDENT_DELETE)
  const canPromote = usePermission(PROMOTION_EXECUTE)

  if (isPending) {
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <DetailLayout>
          <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
          <EmptyState
            title="Student not found"
            description="This student doesn't exist, isn't in your branch, or you don't have access."
            action={
              <Link href={backHref}>
                <Button>{backLabel}</Button>
              </Link>
            }
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <ErrorPanel
          description="We couldn't load this student."
          onRetry={() => void refetch()}
        />
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

  // Manage actions live in the hero `⋮` overflow menu (Change photo /
  // Deactivate). Profile edits happen inline on each card, so there's no hero
  // Edit button. The section-switching items (Attendance, Results, …) are tabs
  // below the hero, not hero actions. TC students are retired — actions hidden.
  const actions: DetailAction[] = [
    ...(!tc && canManage
      ? [
          {
            key: "photo",
            label: "Change photo",
            icon: ImageUp,
            onSelect: () => setPhotoOpen(true),
          },
          ...(canResend
            ? [
                {
                  key: "resend",
                  label: "Resend credentials",
                  icon: Mail,
                  onSelect: () => setResendOpen(true),
                },
              ]
            : []),
          {
            key: "status",
            label: active ? "Deactivate" : "Activate",
            icon: active ? PowerOff : Power,
            onSelect: () => setStatusOpen(true),
            destructive: active,
            separatorBefore: true,
          },
        ]
      : []),
    ...(!tc && active && canPromote
      ? [
          {
            key: "promote",
            label: "Promote student",
            icon: ArrowUpCircle,
            onSelect: () => setPromoteOpen(true),
            separatorBefore: !tc && canManage,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "delete",
            label: "Move to trash",
            icon: Trash2,
            onSelect: () => setDeleteOpen(true),
            destructive: true,
            separatorBefore: actionsSeparator(
              !tc && (canManage || (active && canPromote))
            ),
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
      ? [{ key: "fees", label: "Billing", icon: Wallet }]
      : []),
    ...(canIdCard ? [{ key: "idcard", label: "ID card", icon: IdCard }] : []),
    ...(canViewTc ? [{ key: "tc", label: "TC", icon: ScrollText }] : []),
  ]

  async function confirmToggleStatus() {
    try {
      await updateStatus.mutateAsync({
        id,
        status: active ? "inactive" : "active",
      })
      toastSuccess(active ? "Student deactivated." : "Student activated.", {
        id: "student-status",
      })
      setStatusOpen(false)
    } catch (err) {
      toastError(err, "Couldn't update the status.", { id: "student-status" })
      throw err
    }
  }

  async function confirmResend() {
    try {
      await resendCredentials.mutateAsync(id)
      toastSuccess("Login credentials resent.", { id: "student-resend" })
      setResendOpen(false)
    } catch (err) {
      toastError(err, "Couldn't resend credentials.", { id: "student-resend" })
      throw err
    }
  }

  async function confirmDelete() {
    try {
      await deleteStudent.mutateAsync(id)
      toastSuccess("Student moved to trash.", { id: "student-delete" })
      router.push(backHref)
    } catch (err) {
      toastError(err, "Couldn't move the student to trash.", {
        id: "student-delete",
      })
      throw err
    }
  }

  return (
    <DetailLayout>
      <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>

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
              <p className="text-[15px] text-copy-secondary">
                {student.name_bn}
              </p>
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

      <StudentPhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        student={student}
      />
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
      <ConfirmDialog
        open={resendOpen}
        onOpenChange={setResendOpen}
        title="Resend credentials"
        description={
          <>
            Generate and email fresh login credentials to{" "}
            <span className="font-medium">{studentDisplayName(student)}</span>?
            The student needs an email address on file to receive them.
          </>
        }
        confirmLabel="Resend"
        pendingLabel="Sending…"
        onConfirm={confirmResend}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Move student to trash"
        description={
          <>
            Move{" "}
            <span className="font-medium">{studentDisplayName(student)}</span>{" "}
            to trash? The student can be restored later from the trash view.
          </>
        }
        confirmLabel="Move to trash"
        onConfirm={confirmDelete}
      />
      <PromoteStudentDialog
        student={
          promoteOpen
            ? {
                id: student.id,
                name: studentDisplayName(student),
                currentRoll: currentEnrollment?.roll_no ?? null,
              }
            : null
        }
        onClose={() => setPromoteOpen(false)}
        onPromoted={() => void refetch()}
      />
    </DetailLayout>
  )
}

function actionsSeparator(hasPriorActions: boolean): boolean {
  return hasPriorActions
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
  const pathname = usePathname()

  return (
    <div>
      <DetailTabs
        tabs={tabs}
        active={active}
        onChange={setActive}
        fill={false}
      />

      {active === "profile" ? (
        <StudentProfilePanel student={student} />
      ) : active === "attendance" ? (
        <StudentAttendancePanel studentId={student.id} />
      ) : active === "results" ? (
        <EnrollmentResultsPanel
          enrollmentId={
            student.enrollments?.find((e) => e.status === "active")?.id ??
            student.enrollments?.[0]?.id
          }
        />
      ) : active === "leaves" ? (
        <ComingSoonPanel
          icon={CalendarOff}
          title="Leaves aren't available yet"
          description="This student's leave applications and approvals will appear here once the leaves module is live."
        />
      ) : active === "fees" ? (
        <StudentInvoicesPanel
          studentId={student.id}
          studentName={studentDisplayName(student)}
          backHref={`${pathname}?tab=fees`}
        />
      ) : active === "idcard" ? (
        <IdCardPanel student={student} />
      ) : active === "tc" ? (
        <StudentTcPanel student={student} />
      ) : null}
    </div>
  )
}

/** The default "Profile" tab: identity, guardians, addresses, enrollments. */
function StudentProfilePanel({ student }: { student: Student }) {
  // Inline editing is gated the same way the hero manage actions are: needs
  // `student.update` and a non-TC (live) student.
  const canManage = usePermission(STUDENT_UPDATE)
  const editable = canManage && !isTcStudent(student.status)

  return (
    <div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <StudentIdentityCard student={student} editable={editable} />
        <StudentGuardiansCard student={student} editable={editable} />
        <StudentAddressCards student={student} editable={editable} />
      </div>

      {/* Enrollment history */}
      <DetailCard
        icon={GraduationCap}
        title="Enrollment history"
        headerClassName="mb-[18px]"
        className="mt-5"
      >
        <StudentEnrollments id={student.id} editable={editable} />
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
