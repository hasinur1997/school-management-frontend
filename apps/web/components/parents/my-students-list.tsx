"use client"

import Link from "next/link"
import { CalendarCheck, FileText, GraduationCap, Lock, Receipt } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { CardGridSkeleton } from "@/components/skeletons"
import { isForbiddenError, isNotFoundError } from "@/lib/api"
import { useMyStudents } from "@/hooks/parents"
import {
  linkedStudentLabel,
  linkedStudentMeta,
  type LinkedStudent,
} from "@/types/parent"

export function MyStudentsList() {
  const { data, isPending, isError, error, refetch } = useMyStudents()

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Header />
        <CardGridSkeleton count={4} />
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error) || isNotFoundError(error)) {
      return (
        <div className="flex flex-col gap-4">
          <Header />
          <EmptyState
            icon={Lock}
            title="You don't have access"
            description="This page is only available to linked parent accounts."
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <Header />
        <ErrorPanel description="We couldn't load your students." onRetry={() => void refetch()} />
      </div>
    )
  }

  const students = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <Header />

      {students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No linked students"
          description="No students are linked to this parent account yet."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <li key={student.id}>
              <StudentCard student={student} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="min-w-0">
      <h1 className="truncate text-xl font-semibold text-copy-primary">My students</h1>
      <p className="truncate text-sm text-copy-muted">
        View linked children and jump to attendance, results, or invoices.
      </p>
    </div>
  )
}

function StudentCard({ student }: { student: LinkedStudent }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-12 shrink-0">
          {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
          <AvatarFallback>{studentInitials(student)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold text-copy-primary">
            {linkedStudentLabel(student)}
          </p>
          <p className="truncate text-sm text-copy-muted">{linkedStudentMeta(student)}</p>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button render={<Link href={`/attendance?student=${student.id}`} />} variant="outline" size="sm">
          <CalendarCheck className="size-4" aria-hidden />
          Attendance
        </Button>
        <Button render={<Link href={`/results?student=${student.id}`} />} variant="outline" size="sm">
          <FileText className="size-4" aria-hidden />
          Results
        </Button>
        <Button render={<Link href={`/fees?student=${student.id}`} />} variant="outline" size="sm">
          <Receipt className="size-4" aria-hidden />
          Invoices
        </Button>
      </div>
    </article>
  )
}

function studentInitials(student: LinkedStudent): string {
  const name = linkedStudentLabel(student)
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "S"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
