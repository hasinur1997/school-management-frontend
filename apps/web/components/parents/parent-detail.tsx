"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarCheck,
  FileText,
  GraduationCap,
  Link2,
  Link2Off,
  Lock,
  Mail,
  Receipt,
  UserRound,
  Users,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import {
  DetailBackLink,
  DetailCard,
  DetailHero,
  DetailLayout,
} from "@/components/detail/detail-ui"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import { usePermission } from "@/hooks/auth/use-permission"
import {
  useParent,
  useUnlinkParentStudent,
  useResendParentCredentials,
} from "@/hooks/parents"
import { isForbiddenError, isNotFoundError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  linkedStudentLabel,
  linkedStudentMeta,
  parentRelationLabel,
  type LinkedStudent,
} from "@/types/parent"
import { PARENT_MANAGE } from "./permissions"
import { LinkStudentsDialog } from "./link-students-dialog"

export function ParentDetail({ id }: { id: string }) {
  const canManage = usePermission(PARENT_MANAGE)
  const { data: parent, isPending, isError, error, refetch } = useParent(id)
  const unlinkStudent = useUnlinkParentStudent()
  const resendCredentials = useResendParentCredentials()

  const [linkOpen, setLinkOpen] = React.useState(false)
  const [unlinkTarget, setUnlinkTarget] = React.useState<LinkedStudent | null>(null)
  const [resendOpen, setResendOpen] = React.useState(false)

  if (!canManage) {
    return (
      <DetailLayout>
        <DetailBackLink href="/parents">Back to parents</DetailBackLink>
        <EmptyState
          icon={Lock}
          title="You don't have access"
          description="You don't have permission to manage parent accounts."
        />
      </DetailLayout>
    )
  }

  if (isPending) {
    return (
      <DetailLayout>
        <DetailBackLink href="/parents">Back to parents</DetailBackLink>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isForbiddenError(error) || isNotFoundError(error)) {
      return (
        <DetailLayout>
          <DetailBackLink href="/parents">Back to parents</DetailBackLink>
          <EmptyState
            icon={Lock}
            title="Parent not found"
            description="This parent doesn't exist, isn't in your branch, or you don't have access."
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <DetailBackLink href="/parents">Back to parents</DetailBackLink>
        <ErrorPanel description="We couldn't load this parent." onRetry={() => void refetch()} />
      </DetailLayout>
    )
  }

  if (!parent) {
    return (
      <DetailLayout>
        <DetailBackLink href="/parents">Back to parents</DetailBackLink>
        <EmptyState
          icon={UserRound}
          title="Parent not found"
          description="This parent doesn't exist, isn't in your branch, or you don't have access."
        />
      </DetailLayout>
    )
  }

  const students = parent.students ?? []

  async function confirmUnlink() {
    if (!parent || !unlinkTarget) return
    try {
      await unlinkStudent.mutateAsync({
        parentId: parent.id,
        studentId: unlinkTarget.id,
      })
      toastSuccess("Student unlinked from parent.", { id: "parent-unlink" })
      setUnlinkTarget(null)
    } catch (err) {
      toastError(err, "Couldn't unlink the student.", { id: "parent-unlink" })
      throw err
    }
  }

  async function confirmResend() {
    try {
      await resendCredentials.mutateAsync(id)
      toastSuccess("Login credentials resent.", { id: "parent-resend" })
      setResendOpen(false)
    } catch (err) {
      toastError(err, "Couldn't resend credentials.", { id: "parent-resend" })
      throw err
    }
  }

  return (
    <DetailLayout>
      <DetailBackLink href="/parents">Back to parents</DetailBackLink>

      <DetailHero
        tone="neutral"
        statusLabel={parentRelationLabel(parent.relation)}
        initials={parentInitials(parent.name)}
        title={parent.name}
        subtitle={
          <>
            <p className="text-[15px] text-copy-secondary">Parent account</p>
            <p className="text-[13px] text-copy-muted">
              {students.length} linked student{students.length === 1 ? "" : "s"}
            </p>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10 gap-[7px] rounded-[10px] px-4 text-sm font-semibold"
              onClick={() => setResendOpen(true)}
            >
              <Mail className="size-4" aria-hidden />
              Resend credentials
            </Button>
            <Button className="h-10 gap-[7px] rounded-[10px] px-4 text-sm font-semibold" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-4" aria-hidden />
              Link student
            </Button>
          </div>
        }
        facts={[
          { label: "Phone", value: parent.phone, mono: true },
          { label: "Email", value: parent.email },
          { label: "Relation", value: parentRelationLabel(parent.relation) },
          { label: "Students", value: String(students.length) },
        ]}
      />

      <div className="flex flex-col gap-5">
        <DetailCard icon={UserRound} title="Parent information">
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoTile label="Name" value={parent.name} />
            <InfoTile label="Relation" value={parentRelationLabel(parent.relation)} />
            <InfoTile label="Phone" value={parent.phone} mono />
            <InfoTile label="Email" value={parent.email} />
          </div>
        </DetailCard>

        <DetailCard
          icon={Users}
          title="Linked students"
          headerClassName="mb-4"
          className="min-w-0"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-copy-muted">
              {students.length === 0
                ? "No students are linked to this parent yet."
                : `${students.length} linked student${students.length === 1 ? "" : "s"}.`}
            </p>
            <Button variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-4" aria-hidden />
              Add link
            </Button>
          </div>

          <LinkedStudentsTable students={students} onUnlink={setUnlinkTarget} />
        </DetailCard>
      </div>

      <LinkStudentsDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        parent={parent}
      />
      <ConfirmDialog
        open={unlinkTarget != null}
        onOpenChange={(open) => !open && setUnlinkTarget(null)}
        title="Unlink student"
        description={
          unlinkTarget ? (
            <>
              Remove <span className="font-medium">{linkedStudentLabel(unlinkTarget)}</span>{" "}
              from <span className="font-medium">{parent.name}</span>&rsquo;s linked students?
            </>
          ) : null
        }
        confirmLabel="Unlink"
        pendingLabel="Unlinking…"
        onConfirm={confirmUnlink}
      />
      <ConfirmDialog
        open={resendOpen}
        onOpenChange={setResendOpen}
        title="Resend credentials"
        description={
          <>
            Generate and email fresh login credentials to{" "}
            <span className="font-medium">{parent.name}</span>
            {parent.email ? ` (${parent.email})` : ""}? The parent needs an email
            address on file to receive them.
          </>
        }
        confirmLabel="Resend"
        pendingLabel="Sending…"
        onConfirm={confirmResend}
      />
    </DetailLayout>
  )
}

function InfoTile({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-subtle/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-copy-muted">
        {label}
      </p>
      <p
        className={
          mono
            ? "mt-1 truncate font-mono text-sm font-medium text-copy-primary"
            : "mt-1 truncate text-sm font-medium text-copy-primary"
        }
      >
        {value || "—"}
      </p>
    </div>
  )
}

function LinkedStudentsTable({
  students,
  onUnlink,
}: {
  students: LinkedStudent[]
  onUnlink: (student: LinkedStudent) => void
}) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No linked students"
        description="Use Add link to connect this parent to a student."
      />
    )
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-surface-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class / Section</TableHead>
              <TableHead>Quick links</TableHead>
              <TableHead className="w-px text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <StudentIdentity student={student} />
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {linkedStudentMeta(student)}
                </TableCell>
                <TableCell>
                  <StudentQuickLinks student={student} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-error hover:text-error"
                    aria-label={`Unlink ${linkedStudentLabel(student)}`}
                    onClick={() => onUnlink(student)}
                  >
                    <Link2Off className="size-4" aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {students.map((student) => (
          <li
            key={student.id}
            className="rounded-xl border border-surface-border bg-subtle/40 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <StudentIdentity student={student} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-error hover:text-error"
                aria-label={`Unlink ${linkedStudentLabel(student)}`}
                onClick={() => onUnlink(student)}
              >
                <Link2Off className="size-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-2 text-sm text-copy-muted">{linkedStudentMeta(student)}</p>
            <div className="mt-3">
              <StudentQuickLinks student={student} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function StudentIdentity({ student }: { student: LinkedStudent }) {
  return (
    <Link href={`/students/${student.id}`} className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
        <AvatarFallback>{parentInitials(linkedStudentLabel(student))}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate font-medium text-copy-primary">
          {linkedStudentLabel(student)}
        </span>
        <span className="block truncate text-xs text-copy-muted">View student profile</span>
      </span>
    </Link>
  )
}

function StudentQuickLinks({ student }: { student: LinkedStudent }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant="outline"
        render={<Link href={`/attendance?student=${student.id}`} />}
      >
        <CalendarCheck className="size-3" aria-hidden />
        Attendance
      </Badge>
      <Badge
        variant="outline"
        render={<Link href={`/results?student=${student.id}`} />}
      >
        <FileText className="size-3" aria-hidden />
        Results
      </Badge>
      <Badge
        variant="outline"
        render={<Link href={`/fees?student=${student.id}`} />}
      >
        <Receipt className="size-3" aria-hidden />
        Invoices
      </Badge>
    </div>
  )
}

function parentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "P"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
