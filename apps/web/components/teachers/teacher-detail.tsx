"use client"

/**
 * Teacher detail / profile (task 2.4): identity + contact, class/subject
 * assignments, an attendance link, and the manage actions (change photo, toggle
 * status, resend credentials). Reads `useTeacher`; writes invalidate the cache
 * so the view refreshes. Owns loading / not-found / error / loaded states; an
 * out-of-branch or missing record surfaces as not-found.
 *
 * Layout follows the shared "detail" design kit (status-accented hero +
 * icon-headed info cards), matching the admission/student detail screens. Below
 * the hero, a URL-persisted tab strip switches between Profile and Attendance;
 * profile edits happen inline on each card, so there's no hero Edit button.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarCheck,
  ImageUp,
  Mail,
  Power,
  PowerOff,
  Trash2,
  User,
} from "lucide-react"

import { Button } from "@/components/button"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import {
  DetailActions,
  DetailBackLink,
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
import { isNotFoundError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useTeacher,
  useToggleTeacherStatus,
  useResendTeacherCredentials,
  useDeleteTeacher,
} from "@/hooks/teachers"
import {
  isTeacherActive,
  teacherDisplayName,
  teacherInitials,
} from "@/types/teacher"
import { TEACHER_DELETE, TEACHER_MANAGE } from "./permissions"
import { TeacherPhotoDialog } from "./teacher-photo-dialog"
import { ConfirmDialog } from "./confirm-dialog"
import {
  TeacherAssignmentsCard,
  TeacherProfileCard,
} from "./teacher-profile-cards"

export function TeacherDetail({ id }: { id: string }) {
  const router = useRouter()
  const { data: teacher, isPending, isError, error, refetch } = useTeacher(id)
  const toggleStatus = useToggleTeacherStatus()
  const resendCredentials = useResendTeacherCredentials()
  const deleteTeacher = useDeleteTeacher()

  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [resendOpen, setResendOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const canViewAttendance = usePermission("attendance.view")
  const canManage = usePermission(TEACHER_MANAGE)
  const canDelete = usePermission(TEACHER_DELETE)

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

  // Manage actions live in the hero `⋮` overflow menu (Change photo / Resend /
  // Activate-Deactivate). Profile edits happen inline on each card, so there's no
  // hero Edit button; Attendance moved to the tab strip below the hero.
  const actions: DetailAction[] = [
    ...(canManage
      ? [
          {
            key: "photo",
            label: "Change photo",
            icon: ImageUp,
            onSelect: () => setPhotoOpen(true),
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
            separatorBefore: true,
          },
        ]
      : []),
  ]

  // View tabs: Profile is always present and the default; Attendance is gated by
  // permission. The active tab is read from `?tab=` so a refresh keeps it.
  const tabs: DetailTab[] = [
    { key: "profile", label: "Profile", icon: User },
    ...(canViewAttendance
      ? [{ key: "attendance", label: "Attendance", icon: CalendarCheck }]
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

  async function confirmDelete() {
    try {
      await deleteTeacher.mutateAsync(id)
      toastSuccess("Teacher moved to trash.", { id: "teacher-delete" })
      setDeleteOpen(false)
      router.push("/teachers")
    } catch (err) {
      toastError(err, "Couldn't move the teacher to trash.", {
        id: "teacher-delete",
      })
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

      <React.Suspense fallback={<DetailSkeleton />}>
        <TeacherDetailTabs tabs={tabs} teacher={teacher} />
      </React.Suspense>

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
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Move teacher to trash"
        description={
          <>
            Move{" "}
            <span className="font-medium">{teacherDisplayName(teacher)}</span> to
            trash? The teacher can be restored later from the trash view.
          </>
        }
        confirmLabel="Move to trash"
        onConfirm={confirmDelete}
      />
    </DetailLayout>
  )
}

type Teacher = NonNullable<ReturnType<typeof useTeacher>["data"]>

/**
 * The tab strip + active panel below the hero. Split out so the `useDetailTab`
 * (`useSearchParams`) read sits behind its own Suspense boundary, keeping the
 * URL-driven active tab from opting the whole route out of static rendering —
 * mirrors the student detail screen.
 */
function TeacherDetailTabs({
  tabs,
  teacher,
}: {
  tabs: DetailTab[]
  teacher: Teacher
}) {
  const { active, setActive } = useDetailTab(tabs)
  const canManage = usePermission(TEACHER_MANAGE)

  return (
    <div>
      <DetailTabs tabs={tabs} active={active} onChange={setActive} fill={false} />

      {active === "attendance" ? (
        <EmptyState
          icon={CalendarCheck}
          title="Attendance"
          description="View and manage this teacher's attendance from the attendance workspace."
          action={
            <Link href={`/attendance?teacher=${teacher.id}`}>
              <Button>Open attendance</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <TeacherProfileCard teacher={teacher} editable={canManage} />
          <TeacherAssignmentsCard teacher={teacher} editable={canManage} />
        </div>
      )}
    </div>
  )
}
