"use client"

/**
 * Profile screen for the currently signed-in user. Reads the resolved
 * `AuthUser` from `useAuth()` (the `AuthProvider` already owns the `GET /auth/me`
 * query and gates the subtree behind its loading/error states, so the user is
 * always present here). Lets the user view their details and edit them, change
 * their photo, and change their password. Role/branch/permission data is
 * read-only — those stay API-owned. Uses the shared detail layout so it mirrors
 * the teacher/student detail pages.
 */

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  CalendarOff,
  FileText,
  GraduationCap,
  IdCard,
  ImageUp,
  KeyRound,
  Lock,
  Pencil,
  ScrollText,
  ShieldCheck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  DetailActions,
  DetailCard,
  DetailHero,
  DetailLayout,
  DetailRow,
  type DetailAction,
} from "@/components/detail/detail-ui"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { SelfAttendance } from "@/components/attendance"
import { useStudent } from "@/hooks/students"
import { isNotFoundError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import {
  authStudentId,
  userInitials,
  type AuthUser,
} from "@/types/auth"
import {
  isTcStudent,
  studentDisplayName,
  studentInitials,
  studentStatusLabel,
  type Student,
} from "@/types/student"
import { StudentEnrollments } from "@/components/students/student-enrollments"
import {
  StudentAddressCards,
  StudentGuardiansCard,
  StudentIdentityCard,
} from "@/components/students/student-profile-cards"
import { ProfileFormDialog } from "./profile-form-dialog"
import { ProfilePhotoDialog } from "./profile-photo-dialog"

export function ProfileView() {
  const { user, roles, isSuperAdmin } = useAuth()

  if (roles.includes("student")) {
    return <StudentSelfProfileView user={user} />
  }

  return <AccountProfileView user={user} roles={roles} isSuperAdmin={isSuperAdmin} />
}

function AccountProfileView({
  user,
  roles,
  isSuperAdmin,
}: {
  user: AuthUser
  roles: string[]
  isSuperAdmin: boolean
}) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)

  const roleLabels = isSuperAdmin && roles.length === 0 ? ["Super admin"] : roles
  const branchLabel = isSuperAdmin
    ? "All branches"
    : (user.branch?.name ?? null)

  const actions: DetailAction[] = [
    {
      key: "photo",
      label: "Change photo",
      icon: ImageUp,
      onSelect: () => setPhotoOpen(true),
    },
    {
      key: "password",
      label: "Change password",
      icon: KeyRound,
      onSelect: () => setPasswordOpen(true),
    },
    {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      onSelect: () => setEditOpen(true),
      primary: true,
    },
  ]

  return (
    <DetailLayout>
      <DetailHero
        tone="info"
        statusLabel={roleLabels[0] ?? "Active"}
        photo={user.photo_url}
        initials={userInitials(user.name)}
        title={user.name}
        subtitle={
          <p className="text-[15px] text-copy-secondary">
            {user.email || user.username || ""}
          </p>
        }
        actions={<DetailActions actions={actions} />}
        facts={[
          { label: "Email", value: user.email },
          { label: "Username", value: user.username },
          { label: "Phone", value: user.phone, mono: true },
          { label: "Branch", value: branchLabel },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Personal */}
        <DetailCard icon={UserRound} title="Personal information">
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Username" value={user.username} />
          <DetailRow label="Phone" value={user.phone} mono />
        </DetailCard>

        {/* Access */}
        <DetailCard icon={ShieldCheck} title="Roles & access" headerClassName="mb-3">
          <DetailRow label="Branch" value={branchLabel} />
          <div className="flex items-start justify-between gap-4 border-t border-surface-border-subtle py-[13px]">
            <span className="shrink-0 text-[13px] text-copy-muted">Roles</span>
            <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
              {roleLabels.length > 0 ? (
                roleLabels.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-copy-muted">—</span>
              )}
            </div>
          </div>
          <EmptyState
            icon={ShieldCheck}
            title="Permissions are managed by an administrator"
            description="Your access is set by your assigned roles and can't be changed here."
            className="border-0 bg-transparent py-4"
          />
        </DetailCard>
      </div>

      <ProfileFormDialog open={editOpen} onOpenChange={setEditOpen} user={user} />
      <ProfilePhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        user={user}
      />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </DetailLayout>
  )
}

function StudentSelfProfileView({ user }: { user: AuthUser }) {
  const studentId = authStudentId(user)
  const query = useStudent(studentId)
  const [photoOpen, setPhotoOpen] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)

  const actions: DetailAction[] = [
    {
      key: "photo",
      label: "Change photo",
      icon: ImageUp,
      onSelect: () => setPhotoOpen(true),
    },
    {
      key: "password",
      label: "Change password",
      icon: KeyRound,
      onSelect: () => setPasswordOpen(true),
    },
  ]

  if (!studentId) {
    return (
      <DetailLayout>
        <DetailHero
          tone="info"
          statusLabel="Student"
          photo={user.photo_url}
          initials={userInitials(user.name)}
          title={user.name}
          subtitle={
            <p className="text-[15px] text-copy-secondary">
              {user.email || user.phone || ""}
            </p>
          }
          actions={<DetailActions actions={actions} />}
          facts={[
            { label: "Class", value: null },
            { label: "Section", value: null },
            { label: "Roll no", value: null, mono: true },
            { label: "Branch", value: user.branch?.name ?? null },
          ]}
        />

        <ProfilePhotoDialog
          open={photoOpen}
          onOpenChange={setPhotoOpen}
          user={user}
        />
        <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      </DetailLayout>
    )
  }

  if (query.isPending) {
    return (
      <DetailLayout>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (query.isError) {
    if (isNotFoundError(query.error)) {
      return (
        <DetailLayout>
          <EmptyState
            icon={Lock}
            title="Student profile not available"
            description="This account is not linked to an accessible student profile."
          />
        </DetailLayout>
      )
    }

    return (
      <DetailLayout>
        <ErrorPanel
          description="We couldn't load your student profile."
          onRetry={() => void query.refetch()}
        />
      </DetailLayout>
    )
  }

  const student = query.data
  const currentEnrollment =
    student.enrollments?.find((e) => e.status === "active") ??
    student.enrollments?.[0] ??
    null
  const tc = isTcStudent(student.status)

  return (
    <DetailLayout>
      <DetailHero
        tone={tc ? "info" : student.status === "active" ? "success" : "error"}
        statusLabel={studentStatusLabel(student.status)}
        photo={user.photo_url ?? student.photo_url}
        initials={studentInitials(student)}
        title={studentDisplayName(student)}
        subtitle={
          <>
            {student.name_bn && student.name_en ? (
              <p className="text-[15px] text-copy-secondary">{student.name_bn}</p>
            ) : null}
            <p className="text-[13px] text-copy-muted">
              {student.branch?.name ?? user.branch?.name ?? "Student"}
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
        <StudentSelfPanel student={student} />
      </React.Suspense>

      <ProfilePhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        user={user}
      />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </DetailLayout>
  )
}

function StudentSelfPanel({ student }: { student: Student }) {
  const params = useSearchParams()
  const active = params.get("tab") ?? "profile"

  if (active === "attendance") {
    return <SelfAttendance />
  }

  if (active === "results") {
    return (
      <ComingSoonPanel
        icon={FileText}
        title="Results aren't available yet"
        description="Your exam results will appear here once the results module is live."
      />
    )
  }

  if (active === "leaves") {
    return (
      <ComingSoonPanel
        icon={CalendarOff}
        title="Leaves aren't available yet"
        description="Your leave applications and approvals will appear here once the leaves module is live."
      />
    )
  }

  if (active === "fees") {
    return (
      <ComingSoonPanel
        icon={Wallet}
        title="Tuition fees aren't available yet"
        description="Your invoices and fee payments will appear here once the finance module is live."
      />
    )
  }

  if (active === "idcard") {
    return (
      <ComingSoonPanel
        icon={IdCard}
        title="ID card isn't available yet"
        description="Your ID card will be available here once the documents module is live."
      />
    )
  }

  if (active === "tc") {
    return (
      <ComingSoonPanel
        icon={ScrollText}
        title="Transfer certificate isn't available yet"
        description="Your transfer certificate will be available here once the documents module is live."
      />
    )
  }

  return <StudentReadonlyProfilePanel student={student} />
}

function StudentReadonlyProfilePanel({ student }: { student: Student }) {
  return (
    <div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <StudentIdentityCard student={student} editable={false} />
        <StudentGuardiansCard student={student} editable={false} />
        <StudentAddressCards student={student} editable={false} />
      </div>

      <DetailCard
        icon={GraduationCap}
        title="Enrollment history"
        headerClassName="mb-[18px]"
        className="mt-5"
      >
        <StudentEnrollments id={student.id} editable={false} />
      </DetailCard>
    </div>
  )
}

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
