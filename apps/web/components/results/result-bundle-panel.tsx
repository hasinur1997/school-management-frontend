"use client"

import * as React from "react"
import {
  Award,
  BookOpen,
  FileText,
  GraduationCap,
  Lock,
  UserRound,
} from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { useEnrollmentResults, useMyResults } from "@/hooks/results"
import { EXAM_TYPE_LABELS } from "@/types/exam"
import type { AnnualResult, PerExamResult, ResultBundle } from "@/types/result"

function formatFigure(value: string | number | null | undefined): string {
  if (value == null || value === "") return "-"
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toFixed(2)
}

function verdictLabel(passed: boolean) {
  return passed ? "Passed" : "Failed"
}

function resultTone(passed: boolean) {
  return passed ? "success" : "error"
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0 rounded-lg border border-surface-border bg-subtle px-3 py-2">
      <p className="text-[11px] font-semibold tracking-wide text-copy-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-semibold text-copy-primary",
          mono && "font-mono tabular-nums"
        )}
      >
        {value || "-"}
      </p>
    </div>
  )
}

function ResultHeader({ bundle }: { bundle: ResultBundle }) {
  const { student } = bundle

  return (
    <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-brand">
            <UserRound className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              Result sheet
            </p>
            <h2 className="truncate text-xl font-bold text-copy-primary">
              {student.name_en || "Unnamed student"}
            </h2>
            <p className="mt-1 text-sm text-copy-muted">
              {student.admission_no || "No admission no"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[34rem]">
          <InfoItem label="Class" value={student.class} />
          <InfoItem label="Section" value={student.section} />
          <InfoItem label="Roll" value={student.roll_no} mono />
          <InfoItem label="Exams" value={bundle.exams.length} mono />
        </div>
      </div>
    </section>
  )
}

function AnnualResultCard({ annual }: { annual: AnnualResult | null }) {
  if (!annual) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No annual result"
        description="The annual result has not been generated or published for this student."
        className="bg-surface"
      />
    )
  }

  return (
    <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-dim text-brand">
              <Award className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-semibold text-copy-primary">
                Annual result
              </h3>
              <p className="text-sm text-copy-muted">
                Weighted by the API across first, second, and final exams.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={annual.published ? "published" : "pending"}
            tone={annual.published ? "success" : "warning"}
            label={annual.published ? "Published" : "Unpublished"}
          />
          <StatusBadge
            status={verdictLabel(annual.is_passed)}
            tone={resultTone(annual.is_passed)}
            label={verdictLabel(annual.is_passed)}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <InfoItem
          label="First semester"
          value={formatFigure(annual.first_semester_gpa)}
          mono
        />
        <InfoItem
          label="Second semester"
          value={formatFigure(annual.second_semester_gpa)}
          mono
        />
        <InfoItem
          label="Final exam"
          value={formatFigure(annual.final_exam_gpa)}
          mono
        />
        <InfoItem label="Annual GPA" value={formatFigure(annual.annual_gpa)} mono />
        <InfoItem label="Grade" value={annual.grade} mono />
      </div>
    </section>
  )
}

function ExamResultCard({ result }: { result: PerExamResult }) {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-surface-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-copy-secondary">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-copy-primary">
              {EXAM_TYPE_LABELS[result.type] ?? result.type}
            </h3>
            <p className="text-sm text-copy-muted">
              GPA {formatFigure(result.gpa)} - Grade {result.grade || "-"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={result.published ? "published" : "pending"}
            tone={result.published ? "success" : "warning"}
            label={result.published ? "Published" : "Unpublished"}
          />
          <StatusBadge
            status={verdictLabel(result.is_passed)}
            tone={resultTone(result.is_passed)}
            label={verdictLabel(result.is_passed)}
          />
        </div>
      </div>

      {result.subjects.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={FileText}
            title="No subject marks"
            description="The API did not return subject marks for this exam result."
            className="bg-subtle/30"
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                  <TableHead className="text-right">Point</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.subjects.map((subject, index) => (
                  <TableRow key={`${subject.name ?? "subject"}-${index}`}>
                    <TableCell className="font-medium text-copy-primary">
                      {subject.name || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatFigure(subject.obtained_marks)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {subject.grade || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatFigure(subject.grade_point)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-2 p-4 md:hidden">
            {result.subjects.map((subject, index) => (
              <div
                key={`${subject.name ?? "subject"}-${index}`}
                className="rounded-lg border border-surface-border bg-subtle p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium text-copy-primary">
                    {subject.name || "-"}
                  </p>
                  <p className="font-mono text-sm font-semibold text-copy-primary">
                    {subject.grade || "-"}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <InfoItem
                    label="Marks"
                    value={formatFigure(subject.obtained_marks)}
                    mono
                  />
                  <InfoItem
                    label="Point"
                    value={formatFigure(subject.grade_point)}
                    mono
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function ResultBundlePanel({ bundle }: { bundle: ResultBundle }) {
  return (
    <div className="flex flex-col gap-4">
      <ResultHeader bundle={bundle} />
      <AnnualResultCard annual={bundle.annual} />
      {bundle.exams.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No exam results"
          description="No per-exam results are available for this enrollment yet."
        />
      ) : (
        <div className="grid gap-4">
          {bundle.exams.map((result) => (
            <ExamResultCard key={result.type} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export function MyResultsPanel({
  studentId,
  sessionId,
}: {
  studentId?: string | null
  sessionId?: string | null
}) {
  const query = useMyResults({ student_id: studentId, session_id: sessionId })

  if (query.isPending) return <ResultsSkeleton />
  if (query.isError) {
    return (
      <ErrorPanel
        icon={Lock}
        title="Couldn't load results"
        description={query.error.message}
        onRetry={() => query.refetch()}
      />
    )
  }

  return <ResultBundlePanel bundle={query.data} />
}

export function EnrollmentResultsPanel({
  enrollmentId,
}: {
  enrollmentId: string | null | undefined
}) {
  const query = useEnrollmentResults(enrollmentId)

  if (!enrollmentId) {
    return (
      <EmptyState
        icon={FileText}
        title="No enrollment selected"
        description="This student does not have an enrollment with results to show."
      />
    )
  }

  if (query.isPending) return <ResultsSkeleton />
  if (query.isError) {
    return (
      <ErrorPanel
        title="Couldn't load results"
        description={query.error.message}
        onRetry={() => query.refetch()}
      />
    )
  }

  return <ResultBundlePanel bundle={query.data} />
}
