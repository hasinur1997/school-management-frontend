"use client"

import * as React from "react"
import { Award, FileText, GraduationCap, Lock } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { useGradingScale } from "@/hooks/marks"
import { useEnrollmentResults, useMyResults } from "@/hooks/results"
import { EXAM_TYPE_LABELS, type ExamType } from "@/types/exam"
import type { GradingBand } from "@/types/mark"
import type {
  AnnualResult,
  PerExamResult,
  ResultBundle,
  ResultStudentSummary,
} from "@/types/result"
import { ResultMarkSheet, type MarkSheetField } from "./result-mark-sheet"

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

/** Adapt one per-exam result into the academic-transcript mark sheet. */
function ExamMarkSheet({
  result,
  student,
  scale,
}: {
  result: PerExamResult
  student: ResultStudentSummary
  scale: GradingBand[] | undefined
}) {
  const label = EXAM_TYPE_LABELS[result.type] ?? result.type
  const fields: MarkSheetField[] = [
    { label: "Student Name", value: student.name_en },
    { label: "Father's Name", value: student.father_name },
    { label: "Mother's Name", value: student.mother_name },
    { label: "Admission No", value: student.admission_no, mono: true },
    { label: "Class", value: student.class },
    { label: "Section", value: student.section },
    { label: "Roll No", value: student.roll_no, mono: true },
    { label: "Examination", value: label },
  ]
  const subjects = result.subjects.map((subject) => ({
    name: subject.name,
    marks: subject.obtained_marks,
    grade: subject.grade,
    point: subject.grade_point,
  }))

  // School name/logo come from settings (not yet implemented); until then the
  // sheet renders its default institution from the imported design.
  return (
    <ResultMarkSheet
      title={`${label} Result`}
      fields={fields}
      scale={scale}
      subjects={subjects}
      gpa={result.gpa}
      grade={result.grade}
    />
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

export function ResultBundlePanel({
  bundle,
  examType,
  showAnnual,
}: {
  bundle: ResultBundle
  /**
   * Narrow the bundle to one semester: only that exam's card is shown and the
   * cross-semester annual card is hidden. Omit for the full bundle.
   */
  examType?: ExamType | null
  /**
   * Force the annual card on/off regardless of `examType` — the annual sub-tab
   * pairs the final exam with the annual card. Omit for the default (annual
   * card only on the full bundle).
   */
  showAnnual?: boolean
}) {
  const exams = examType
    ? bundle.exams.filter((result) => result.type === examType)
    : bundle.exams
  const annualVisible = showAnnual ?? !examType

  // Server-owned grading scale for the transcript's range/grade/point legend.
  // Absent (or forbidden for the viewer) → the sheet just hides the legend.
  const scale = useGradingScale().data

  return (
    <div className="flex flex-col gap-4">
      {annualVisible ? <AnnualResultCard annual={bundle.annual} /> : null}
      {exams.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No exam results"
          description={
            examType
              ? `No ${EXAM_TYPE_LABELS[examType].toLowerCase()} result is available for this enrollment yet.`
              : "No per-exam results are available for this enrollment yet."
          }
        />
      ) : (
        <div className="grid gap-4">
          {exams.map((result) => (
            <ExamMarkSheet
              key={result.type}
              result={result}
              student={bundle.student}
              scale={scale}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Sub-tab views on the student-detail Results tab. The two semesters map
 * straight to their exam type; "annual" shows the final exam alongside the
 * cross-semester annual card.
 */
type ResultView = ExamType | "annual"

const RESULT_VIEWS: { value: ResultView; label: string }[] = [
  { value: "first_semester", label: "First Semester" },
  { value: "second_semester", label: "Second Semester" },
  { value: "annual", label: "Annual Exam Result" },
]

function ResultViewTabs({
  active,
  onChange,
}: {
  active: ResultView
  onChange: (view: ResultView) => void
}) {
  return (
    <div className="flex overflow-x-auto rounded-xl bg-track p-1">
      {RESULT_VIEWS.map((item) => {
        const selected = active === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors",
              selected
                ? "bg-surface text-brand shadow-sm"
                : "text-copy-secondary hover:bg-hover hover:text-copy-primary"
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/** A result bundle behind semester/annual sub-tabs. */
function TabbedResultBundle({ bundle }: { bundle: ResultBundle }) {
  const [view, setView] = React.useState<ResultView>("first_semester")

  return (
    <div className="flex flex-col gap-4">
      <ResultViewTabs active={view} onChange={setView} />
      <ResultBundlePanel
        bundle={bundle}
        examType={view === "annual" ? "final" : view}
        showAnnual={view === "annual"}
      />
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

  return <TabbedResultBundle bundle={query.data} />
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

  return <TabbedResultBundle bundle={query.data} />
}
