"use client"

/**
 * Enrollment history for a student (task 2.7) — the class history from the
 * dedicated `GET /students/{id}/enrollments` endpoint (`useStudentEnrollments`),
 * newest first. Owns its own loading / empty / error / loaded states so the rest
 * of the profile renders even while this is loading or fails.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useStudentEnrollments } from "@/hooks/students"
import type { StudentEnrollment } from "@/types/student"

const EMPTY = "—"

export function StudentEnrollments({ id }: { id: string }) {
  const { data, isPending, isError, refetch } = useStudentEnrollments(id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorPanel
        description="We couldn't load the enrollment history."
        onRetry={() => void refetch()}
      />
    )
  }

  const enrollments = data ?? []
  if (enrollments.length === 0) {
    return (
      <EmptyState
        title="No enrollments"
        description="This student has no recorded class history yet."
        className="border-0 bg-transparent py-6"
      />
    )
  }

  return (
    <>
      {/* Table ≥ sm */}
      <div className="hidden overflow-hidden rounded-lg border border-surface-border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-copy-primary">
                  {e.session || EMPTY}
                </TableCell>
                <TableCell className="text-copy-secondary">{e.class || EMPTY}</TableCell>
                <TableCell className="text-copy-secondary">{e.section || EMPTY}</TableCell>
                <TableCell className="text-copy-secondary">
                  {e.roll_no != null && e.roll_no !== "" ? e.roll_no : EMPTY}
                </TableCell>
                <TableCell>
                  <StatusBadge status={e.status} label={titleCase(e.status)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Card list < sm */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {enrollments.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-1 rounded-lg border border-surface-border bg-base/40 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-copy-primary">{e.session || EMPTY}</span>
              <StatusBadge status={e.status} label={titleCase(e.status)} />
            </div>
            <p className="text-sm text-copy-secondary">
              {[e.class, e.section].filter(Boolean).join(" · ") || EMPTY}
              {e.roll_no != null && e.roll_no !== "" ? ` · Roll ${e.roll_no}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}

function titleCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export type { StudentEnrollment }
