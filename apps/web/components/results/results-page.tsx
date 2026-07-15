"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  FileSearch,
  GraduationCap,
  Lock,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { AcademicSelect } from "@/components/academic/academic-select"
import { ClassSelect } from "@/components/academic/class-select"
import { SectionSelect } from "@/components/academic/section-select"
import { SessionSelect } from "@/components/academic/session-select"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { useExams } from "@/hooks/exams"
import { useMyStudents } from "@/hooks/parents"
import {
  useExamResults,
  useGenerateAnnualResults,
  useGenerateExamResults,
  usePublishAnnualResults,
  usePublishExamResults,
  useResultSearch,
} from "@/hooks/results"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  EXAM_TYPE_LABELS,
  EXAM_TYPES,
  type Exam,
  type ExamType,
} from "@/types/exam"
import type {
  ExamResultRow,
  ResultGenerationSummary,
  ResultPassFilter,
  ResultSearchParams,
} from "@/types/result"
import { ListPager } from "@/components/list-pager"
import { StatusBadge } from "@/components/status-badge"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import { MyResultsPanel, ResultBundlePanel, ResultsSkeleton } from "./result-bundle-panel"
import { RESULT_GENERATE, RESULT_VIEW } from "./permissions"

type StaffView = "search" | "exam" | "annual" | "publication"
type SearchMode = "admission" | "coordinates"

const STAFF_VIEWS: Array<{
  value: StaffView
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: "search", label: "Student search", icon: FileSearch },
  { value: "exam", label: "Exam results", icon: BookOpenCheck },
  { value: "annual", label: "Annual actions", icon: GraduationCap },
  { value: "publication", label: "Result publication", icon: BadgeCheck },
]

function formatFigure(value: string | number | null | undefined): string {
  if (value == null || value === "") return "-"
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toFixed(2)
}

function useStaffView(): [StaffView, (view: StaffView) => void] {
  const router = useRouter()
  const params = useSearchParams()
  const raw = params.get("view")
  const active: StaffView =
    raw === "exam" ||
    raw === "annual" ||
    raw === "publication" ||
    raw === "search"
      ? raw
      : "search"

  const setActive = React.useCallback(
    (view: StaffView) => {
      const next = new URLSearchParams(params.toString())
      if (view === "search") {
        next.delete("view")
      } else {
        next.set("view", view)
      }
      const query = next.toString()
      router.replace(query ? `/results?${query}` : "/results", { scroll: false })
    },
    [params, router]
  )

  return [active, setActive]
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-copy-muted">
        <Award className="size-4" aria-hidden />
        Exams and results
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[27px] font-bold tracking-[-0.025em] text-copy-primary">
            Results
          </h1>
          <p className="max-w-2xl text-sm text-copy-muted">
            View student result bundles, browse generated exam results, and run
            permission-gated result publication actions.
          </p>
        </div>
      </div>
    </div>
  )
}

function StaffViewTabs({
  active,
  onChange,
}: {
  active: StaffView
  onChange: (view: StaffView) => void
}) {
  return (
    <div className="flex overflow-x-auto rounded-xl bg-track p-1">
      {STAFF_VIEWS.map((item) => {
        const Icon = item.icon
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
            <Icon className="size-4" aria-hidden />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Class picker scoped to the chosen exam: an exam targeting an explicit set of
 * classes only offers those; an all-classes exam offers every class via the
 * shared `ClassSelect`. Disabled until an exam is chosen.
 */
function SearchClassPicker({
  exam,
  value,
  onValueChange,
}: {
  exam: Exam | null
  value: string | null
  onValueChange: (value: string | null) => void
}) {
  if (exam && !exam.all_classes) {
    const options = (exam.classes ?? []).map((schoolClass) => ({
      value: schoolClass.id,
      label: schoolClass.name || `Class #${schoolClass.id}`,
    }))
    return (
      <AcademicSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder="Select class"
        emptyPlaceholder="No classes on this exam"
      />
    )
  }

  return (
    <ClassSelect value={value} onValueChange={onValueChange} disabled={exam == null} />
  )
}

function StaffSearchPanel() {
  const [mode, setMode] = React.useState<SearchMode>("admission")
  const [admissionNo, setAdmissionNo] = React.useState("")
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [examName, setExamName] = React.useState<string | null>(null)
  const [semester, setSemester] = React.useState<ExamType | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)
  const [rollNo, setRollNo] = React.useState("")
  const [submitted, setSubmitted] = React.useState<ResultSearchParams | null>(
    null
  )
  // Frozen at submit so tweaking the pickers doesn't re-filter shown results.
  const [submittedSemester, setSubmittedSemester] =
    React.useState<ExamType | null>(null)

  // Scope the exam list to the chosen session so a same-named exam from another
  // session can't be resolved (one exam per session/class/type).
  const examsQuery = useExams(
    { session_id: sessionId, page: 1, per_page: 100 },
    mode === "coordinates" && Boolean(sessionId)
  )
  const exams = React.useMemo(
    () => examsQuery.data?.data ?? [],
    [examsQuery.data]
  )

  // The exam picker offers distinct names; semester then picks among that
  // name's `type` variants. Both together resolve the actual exam record,
  // which pins the session the bundle search runs against.
  const examNames = React.useMemo(() => {
    const names: string[] = []
    for (const exam of exams) {
      if (!names.includes(exam.name)) names.push(exam.name)
    }
    return names
  }, [exams])
  const semesterOptions = React.useMemo(() => {
    if (examName == null) return []
    const types: ExamType[] = []
    for (const exam of exams) {
      if (exam.name === examName && !types.includes(exam.type)) {
        types.push(exam.type)
      }
    }
    return EXAM_TYPES.filter((type) => types.includes(type))
  }, [exams, examName])

  const selectedExam =
    examName != null && semester != null
      ? (exams.find(
          (exam) => exam.name === examName && exam.type === semester
        ) ?? null)
      : null

  const query = useResultSearch(submitted ?? {}, submitted !== null)

  // When the active branch changes, the exam list re-scopes. Drop a selection
  // that is no longer in it so the form can't keep another branch's tuple
  // (state adjusted during render; the null reset keeps it from re-entering).
  if (
    examName != null &&
    examsQuery.data != null &&
    !exams.some((exam) => exam.name === examName)
  ) {
    setExamName(null)
    setSemester(null)
    setClassId(null)
    setSectionId(null)
  }

  // Section stays optional — a class without sections searches by roll alone.
  const canSubmit =
    mode === "admission"
      ? admissionNo.trim().length > 0
      : Boolean(sessionId && classId && rollNo.trim())

  function changeSession(value: string | null) {
    setSessionId(value)
    setExamName(null)
    setSemester(null)
    setClassId(null)
    setSectionId(null)
  }
  function changeExam(value: string | null) {
    setExamName(value)
    // Pre-select the semester when the exam only exists under one type.
    const types = new Set(
      exams.filter((exam) => exam.name === value).map((exam) => exam.type)
    )
    setSemester(types.size === 1 ? [...types][0]! : null)
    setClassId(null)
    setSectionId(null)
  }
  function changeSemester(value: ExamType | null) {
    setSemester(value)
    setClassId(null)
    setSectionId(null)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setSectionId(null)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    // Coordinates search narrows the bundle to the picked semester; an
    // admission-no search shows the full bundle.
    setSubmittedSemester(mode === "coordinates" ? semester : null)
    setSubmitted(
      mode === "admission"
        ? { admission_no: admissionNo }
        : {
            session_id: sessionId,
            class_id: classId,
            section_id: sectionId,
            roll_no: rollNo,
          }
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "admission" ? "default" : "outline"}
              onClick={() => setMode("admission")}
            >
              Admission no
            </Button>
            <Button
              type="button"
              variant={mode === "coordinates" ? "default" : "outline"}
              onClick={() => setMode("coordinates")}
            >
              Class coordinates
            </Button>
          </div>

          {mode === "admission" ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Admission no
                </span>
                <Input
                  value={admissionNo}
                  onChange={(event) => setAdmissionNo(event.target.value)}
                  placeholder="MP-2026-0009"
                />
              </label>
              <Button type="submit" disabled={!canSubmit} className="self-end">
                <Search className="size-4" aria-hidden />
                Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Session
                </span>
                <SessionSelect value={sessionId} onValueChange={changeSession} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Exam
                </span>
                <AcademicSelect
                  value={examName}
                  onValueChange={changeExam}
                  options={examNames.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  isLoading={sessionId != null && examsQuery.isPending}
                  isError={examsQuery.isError}
                  disabled={sessionId == null}
                  disabledPlaceholder="Select session first"
                  placeholder="Select exam"
                  emptyPlaceholder="No exams"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Semester
                </span>
                <AcademicSelect
                  value={semester}
                  onValueChange={changeSemester}
                  options={semesterOptions.map((type) => ({
                    value: type,
                    label: EXAM_TYPE_LABELS[type],
                  }))}
                  disabled={examName == null}
                  disabledPlaceholder="Select exam first"
                  placeholder="Select semester"
                  emptyPlaceholder="No semesters"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Class
                </span>
                <SearchClassPicker
                  exam={selectedExam}
                  value={classId}
                  onValueChange={changeClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Section (optional)
                </span>
                <SectionSelect
                  classId={classId}
                  value={sectionId}
                  onValueChange={setSectionId}
                  clearLabel="All sections"
                  placeholder="All sections"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                    Roll
                  </span>
                  <Input
                    value={rollNo}
                    onChange={(event) => setRollNo(event.target.value)}
                    inputMode="numeric"
                    placeholder="12"
                    className="font-mono tabular-nums"
                  />
                </label>
                <Button type="submit" disabled={!canSubmit} className="self-end">
                  <Search className="size-4" aria-hidden />
                  Search
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>

      {!submitted ? (
        <EmptyState
          icon={FileSearch}
          title="Search for a student"
          description="Use an admission number or the full class coordinates to load a result bundle."
        />
      ) : query.isPending ? (
        <ResultsSkeleton />
      ) : query.isError ? (
        <ErrorPanel
          title="No result bundle found"
          description={query.error.message}
          onRetry={() => query.refetch()}
        />
      ) : (
        <ResultBundlePanel bundle={query.data} examType={submittedSemester} />
      )}
    </section>
  )
}

/**
 * Student name linking to the detail page's Results tab, mirroring the mark
 * entry grid. Falls back to plain text when the row carries no `student_id`
 * (older API payloads).
 */
function ResultStudentLink({
  row,
  className,
}: {
  row: ExamResultRow
  className?: string
}) {
  const name = row.name_en || "-"
  if (!row.student_id) return <span className={className}>{name}</span>
  return (
    <Link
      href={`/students/${row.student_id}?tab=results`}
      className={cn(
        "rounded-sm outline-none hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand/40",
        className
      )}
    >
      {name}
    </Link>
  )
}

/** Share of the cohort as "62.5%", or null when there is no cohort yet. */
function formatShare(part: number | null, whole: number | null): string | null {
  if (part == null || whole == null || whole <= 0) return null
  return `${((part / whole) * 100).toFixed(1)}%`
}

function ResultSummaryCard({
  label,
  value,
  percent,
  tone,
}: {
  label: string
  value: number | null
  /** Rendered right of the figure — the value's share of the cohort. */
  percent?: string | null
  tone?: "success" | "error" | "brand"
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "error"
        ? "text-error"
        : tone === "brand"
          ? "text-brand"
          : "text-copy-primary"

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
        {label}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className={cn("font-mono text-2xl font-bold tabular-nums", toneClass)}>
          {value ?? "-"}
        </p>
        {percent != null ? (
          <p className={cn("font-mono text-sm font-semibold tabular-nums", toneClass)}>
            {percent}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ExamResultsPanel() {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [examName, setExamName] = React.useState<string | null>(null)
  const [semester, setSemester] = React.useState<ExamType | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [passFilter, setPassFilter] = React.useState<ResultPassFilter>("all")
  const [page, setPage] = React.useState(1)
  // Frozen at submit so tweaking the pickers doesn't reload shown results; the
  // verdict filter stays live and re-filters the submitted list.
  const [submitted, setSubmitted] = React.useState<{
    exam_id: string
    class_id: string
  } | null>(null)

  // Scope the exam list to the chosen session: an exam name + semester is only
  // unique within a session (one exam per session/class/type), so without this
  // a same-named exam from another session could be resolved and its (empty)
  // result sheet shown instead.
  const examsQuery = useExams(
    { session_id: sessionId, page: 1, per_page: 100 },
    Boolean(sessionId)
  )
  const exams = React.useMemo(
    () => examsQuery.data?.data ?? [],
    [examsQuery.data]
  )

  // The exam picker offers distinct names; semester then picks among that
  // name's `type` variants. Both together resolve the actual exam record.
  const examNames = React.useMemo(() => {
    const names: string[] = []
    for (const exam of exams) {
      if (!names.includes(exam.name)) names.push(exam.name)
    }
    return names
  }, [exams])
  const semesterOptions = React.useMemo(() => {
    if (examName == null) return []
    const types: ExamType[] = []
    for (const exam of exams) {
      if (exam.name === examName && !types.includes(exam.type)) {
        types.push(exam.type)
      }
    }
    return EXAM_TYPES.filter((type) => types.includes(type))
  }, [exams, examName])

  const selectedExam =
    examName != null && semester != null
      ? (exams.find(
          (exam) => exam.name === examName && exam.type === semester
        ) ?? null)
      : null

  // When the active branch changes, the exam list re-scopes. Drop a selection
  // that is no longer in it so the form can't keep another branch's tuple
  // (state adjusted during render; the null reset keeps it from re-entering).
  if (
    examName != null &&
    examsQuery.data != null &&
    !exams.some((exam) => exam.name === examName)
  ) {
    setExamName(null)
    setSemester(null)
    setClassId(null)
  }

  const rows = useExamResults(
    { ...submitted, is_passed: passFilter, page },
    submitted !== null
  )
  // `meta.summary` describes the whole cohort under the submitted scope,
  // regardless of the verdict filter, so any page carries the strip's figures.
  const summary = rows.data?.meta?.summary ?? null
  const totalExaminee = summary?.examinee ?? null
  const totalPassed = summary?.passed ?? null
  const totalFailed = summary?.failed ?? null
  const totalGpa5 = summary?.gpa5 ?? null

  function changeSession(value: string | null) {
    setSessionId(value)
    setExamName(null)
    setSemester(null)
    setClassId(null)
  }
  function changeExam(value: string | null) {
    setExamName(value)
    // Pre-select the semester when the exam only exists under one type.
    const types = new Set(
      exams.filter((exam) => exam.name === value).map((exam) => exam.type)
    )
    setSemester(types.size === 1 ? [...types][0]! : null)
    setClassId(null)
  }
  function changeSemester(value: ExamType | null) {
    setSemester(value)
    setClassId(null)
  }

  const canSubmit = selectedExam != null && classId != null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedExam || !classId) return
    setPage(1)
    setSubmitted({
      exam_id: selectedExam.id,
      class_id: classId,
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Session
            </span>
            <SessionSelect value={sessionId} onValueChange={changeSession} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Exam
            </span>
            <AcademicSelect
              value={examName}
              onValueChange={changeExam}
              options={examNames.map((name) => ({
                value: name,
                label: name,
              }))}
              isLoading={sessionId != null && examsQuery.isPending}
              isError={examsQuery.isError}
              disabled={sessionId == null}
              disabledPlaceholder="Select session first"
              placeholder="Select exam"
              emptyPlaceholder="No exams"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Semester
            </span>
            <AcademicSelect
              value={semester}
              onValueChange={changeSemester}
              options={semesterOptions.map((type) => ({
                value: type,
                label: EXAM_TYPE_LABELS[type],
              }))}
              disabled={examName == null}
              disabledPlaceholder="Select exam first"
              placeholder="Select semester"
              emptyPlaceholder="No semesters"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Class
            </span>
            <SearchClassPicker
              exam={selectedExam}
              value={classId}
              onValueChange={setClassId}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Verdict
            </span>
            <AcademicSelect<ResultPassFilter>
              value={passFilter}
              onValueChange={(next) => {
                setPassFilter(next ?? "all")
                setPage(1)
              }}
              options={[
                { value: "all", label: "All results" },
                { value: "passed", label: "Passed" },
                { value: "failed", label: "Failed" },
              ]}
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={!canSubmit}>
              <Search className="size-4" aria-hidden />
              Search
            </Button>
          </div>
        </div>
      </form>

      {submitted !== null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResultSummaryCard label="Total examinee" value={totalExaminee} />
          <ResultSummaryCard
            label="Total passed"
            value={totalPassed}
            percent={formatShare(totalPassed, totalExaminee)}
            tone="success"
          />
          <ResultSummaryCard
            label="Total failed"
            value={totalFailed}
            percent={formatShare(totalFailed, totalExaminee)}
            tone="error"
          />
          <ResultSummaryCard
            label="Total GPA-5"
            value={totalGpa5}
            percent={formatShare(totalGpa5, totalExaminee)}
            tone="brand"
          />
        </div>
      ) : null}

      {!submitted ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Search exam results"
          description="Pick an exam, semester, and class, then search to browse the generated result sheet."
        />
      ) : rows.isPending ? (
        <ResultsSkeleton />
      ) : rows.isError ? (
        <ErrorPanel
          title="Couldn't load exam results"
          description={rows.error.message}
          onRetry={() => rows.refetch()}
        />
      ) : rows.data.data.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No generated results"
          description="No result rows match this exam and filters."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Roll</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">GPA</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                  <TableHead className="text-right">Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.data.map((row) => (
                  <TableRow key={row.enrollment_id}>
                    <TableCell className="font-medium text-copy-primary">
                      <ResultStudentLink row={row} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.roll_no ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatFigure(row.total_marks)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatFigure(row.gpa)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {row.grade || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge
                        status={row.is_passed ? "passed" : "failed"}
                        tone={row.is_passed ? "success" : "error"}
                        label={row.is_passed ? "Passed" : "Failed"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {rows.data.data.map((row) => (
              <div
                key={row.enrollment_id}
                className="rounded-lg border border-surface-border bg-subtle p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-copy-primary">
                      <ResultStudentLink row={row} />
                    </p>
                    <p className="font-mono text-sm text-copy-muted">
                      Roll {row.roll_no ?? "-"}
                    </p>
                  </div>
                  <StatusBadge
                    status={row.is_passed ? "passed" : "failed"}
                    tone={row.is_passed ? "success" : "error"}
                    label={row.is_passed ? "Passed" : "Failed"}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <p>
                    <span className="block text-copy-muted">Total</span>
                    <span className="font-mono">{formatFigure(row.total_marks)}</span>
                  </p>
                  <p>
                    <span className="block text-copy-muted">GPA</span>
                    <span className="font-mono">{formatFigure(row.gpa)}</span>
                  </p>
                  <p>
                    <span className="block text-copy-muted">Grade</span>
                    <span className="font-mono font-semibold">{row.grade || "-"}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-border px-4 py-3">
            <ListPager
              meta={rows.data.meta}
              page={page}
              lastPage={rows.data.meta?.last_page ?? 1}
              unit="result"
              disabled={rows.isFetching}
              onPage={setPage}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function AnnualActionsPanel({ canGenerate }: { canGenerate: boolean }) {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [confirm, setConfirm] = React.useState<"generate" | "publish" | null>(
    null
  )
  const generate = useGenerateAnnualResults()
  const publish = usePublishAnnualResults()
  const ready = Boolean(sessionId && classId)

  async function runConfirmed() {
    if (!sessionId || !classId || !confirm) return
    const input = { session_id: sessionId, class_id: classId }

    try {
      if (confirm === "generate") {
        const result = await generate.mutateAsync(input)
        toastSuccess(
          `Generated ${result.generated} annual result${result.generated === 1 ? "" : "s"}.`,
          { id: "results-annual-generate" }
        )
      } else {
        const result = await publish.mutateAsync(input)
        toastSuccess(
          `Published ${result.published} annual result${result.published === 1 ? "" : "s"}.`,
          { id: "results-annual-publish" }
        )
      }
    } catch (error) {
      toastError(error, "Annual result action failed.", {
        id: "results-annual-action",
      })
      throw error
    }
  }

  if (!canGenerate) {
    return (
      <EmptyState
        icon={Lock}
        title="Generation is restricted"
        description="You do not have permission to generate or publish annual results."
      />
    )
  }

  return (
    <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-copy-primary">
          Annual result actions
        </h2>
        <p className="text-sm text-copy-muted">
          Select the session and class tuple for the API&apos;s annual generation and
          publication workflow.
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Session
          </span>
          <SessionSelect value={sessionId} onValueChange={setSessionId} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Class
          </span>
          <ClassSelect value={classId} onValueChange={setClassId} />
        </label>
        <div className="flex flex-wrap gap-2 self-end">
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => setConfirm("generate")}
          >
            <Send className="size-4" aria-hidden />
            Generate
          </Button>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => setConfirm("publish")}
          >
            <ShieldCheck className="size-4" aria-hidden />
            Publish
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm === "publish"
            ? "Publish annual results?"
            : "Generate annual results?"
        }
        description={
          confirm === "publish"
            ? "This stamps annual result rows as published for the selected session and class."
            : "This regenerates annual result rows from the three published exam results."
        }
        confirmLabel={confirm === "publish" ? "Publish annual" : "Generate annual"}
        pendingLabel={confirm === "publish" ? "Publishing..." : "Generating..."}
        onConfirm={runConfirmed}
      />
    </section>
  )
}

/**
 * Publish a single exam's results so the search surfaces make them visible to
 * everyone. The exam is uniquely resolved by the (session, class, type) tuple
 * within a branch (`types/exam.ts`), so Session + Semester + Class pin exactly
 * one exam. The button always generates then publishes: generation computes the
 * result rows from the entered marks (a step the mark-entry "Publish results"
 * lock does NOT perform), and publish exposes them to the search surfaces.
 */
function ResultPublicationPanel({ canGenerate }: { canGenerate: boolean }) {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [semester, setSemester] = React.useState<ExamType | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [confirm, setConfirm] = React.useState(false)

  // Resolve the exam for the chosen tuple. Enabled only once all three fields
  // are set; the (session, class, type) uniqueness makes this a single row.
  const examsQuery = useExams(
    { session_id: sessionId, class_id: classId, type: semester ?? "all" },
    Boolean(sessionId && classId && semester)
  )
  const targetExam = React.useMemo(
    () =>
      (examsQuery.data?.data ?? []).find(
        (exam) => exam.type === semester
      ) ?? null,
    [examsQuery.data, semester]
  )

  const generate = useGenerateExamResults()
  const publish = usePublishExamResults()
  const busy = generate.isPending || publish.isPending
  const ready = Boolean(sessionId && semester && classId && targetExam)

  async function runConfirmed() {
    if (!targetExam) return
    const examId = targetExam.id

    // Result rows are always computed separately from the marks lock: the
    // mark-entry "Publish results" freezes marks and flips the exam to
    // `published` but never generates rows, so generate here regardless of
    // status. A re-generate on an already-released exam is rejected; that's
    // non-fatal (its rows exist), so remember the error and let publish try —
    // if publish also fails, the generate error is the real cause to surface.
    let generation: ResultGenerationSummary | null = null
    let generateError: unknown = null
    try {
      generation = await generate.mutateAsync(examId)
    } catch (error) {
      generateError = error
    }

    // Nothing computed and nothing pre-existing — explain why (e.g. no marks
    // entered, or students missing subject marks) instead of letting publish
    // fail with the vaguer "generate results first" message.
    if (generation != null && generation.generated === 0) {
      const skipped = generation.skipped.length
      toastError(
        new Error(
          skipped > 0
            ? `No results generated: ${skipped} student${skipped === 1 ? " is" : "s are"} missing marks for one or more subjects. Enter every subject's marks, then publish.`
            : "No results generated: enter and save marks for this exam first."
        ),
        "Couldn't publish results.",
        { id: "results-exam-publish" }
      )
      return
    }

    try {
      const result = await publish.mutateAsync(examId)
      const skipped = generation?.skipped.length ?? 0
      toastSuccess(
        `Published ${result.published} result${result.published === 1 ? "" : "s"}.` +
          (skipped > 0
            ? ` ${skipped} student${skipped === 1 ? "" : "s"} skipped for missing subject marks.`
            : "") +
          " Results are now searchable.",
        { id: "results-exam-publish" }
      )
    } catch (publishError) {
      // Prefer the generate error: when publish fails because nothing was
      // generated, that error (e.g. "No marks entered for this exam") names the
      // actual blocker.
      toastError(generateError ?? publishError, "Couldn't publish results.", {
        id: "results-exam-publish",
      })
      throw publishError
    }
  }

  if (!canGenerate) {
    return (
      <EmptyState
        icon={Lock}
        title="Publication is restricted"
        description="You do not have permission to publish results."
      />
    )
  }

  const noExam =
    Boolean(sessionId && semester && classId) &&
    examsQuery.isSuccess &&
    targetExam == null

  return (
    <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-copy-primary">
          Result publication
        </h2>
        <p className="text-sm text-copy-muted">
          Pick the session, semester, and class, then publish so the exam&apos;s
          results become searchable for everyone.
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Session
          </span>
          <SessionSelect value={sessionId} onValueChange={setSessionId} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Semester
          </span>
          <AcademicSelect
            value={semester}
            onValueChange={setSemester}
            options={EXAM_TYPES.map((type) => ({
              value: type,
              label: EXAM_TYPE_LABELS[type],
            }))}
            placeholder="Select semester"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Class
          </span>
          <ClassSelect value={classId} onValueChange={setClassId} />
        </label>
        <div className="flex items-end">
          <Button type="button" disabled={!ready || busy} onClick={() => setConfirm(true)}>
            <ShieldCheck className="size-4" aria-hidden />
            Publish results
          </Button>
        </div>
      </div>

      {noExam ? (
        <p className="mt-3 text-sm text-error">
          No exam exists for this session, semester, and class.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirm}
        onOpenChange={(open) => !open && setConfirm(false)}
        title="Publish results?"
        description="This generates the result rows from the entered marks and publishes them, making them searchable for everyone."
        confirmLabel="Publish results"
        pendingLabel="Publishing..."
        onConfirm={runConfirmed}
      />
    </section>
  )
}

function StaffResultsPage({
  canGenerate,
}: {
  canGenerate: boolean
}) {
  const [active, setActive] = useStaffView()

  return (
    <div className="flex flex-col gap-4">
      <StaffViewTabs active={active} onChange={setActive} />
      {active === "search" ? (
        <StaffSearchPanel />
      ) : active === "exam" ? (
        <ExamResultsPanel />
      ) : active === "annual" ? (
        <AnnualActionsPanel canGenerate={canGenerate} />
      ) : (
        <ResultPublicationPanel canGenerate={canGenerate} />
      )}
    </div>
  )
}

function SelfResultsPage() {
  const params = useSearchParams()
  const { roles } = useAuth()
  const isParent = roles.includes("parent")
  const studentParam = params.get("student")
  const sessionParam = params.get("session")
  const [selectedStudent, setSelectedStudent] = React.useState<string | null>(null)
  const myStudents = useMyStudents(isParent)

  const showParentPicker =
    myStudents.isSuccess && Array.isArray(myStudents.data) && myStudents.data.length > 0
  const effectiveStudentId = showParentPicker
    ? selectedStudent ?? studentParam ?? myStudents.data[0]?.id ?? null
    : studentParam

  return (
    <section className="flex flex-col gap-4">
      {myStudents.isError ? null : showParentPicker ? (
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <label className="grid max-w-md gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Child
            </span>
            <AcademicSelect
              value={effectiveStudentId}
              onValueChange={setSelectedStudent}
              options={myStudents.data.map((student) => ({
                value: student.id,
                label: student.name_en || `Student ${student.id}`,
              }))}
              placeholder="Select child"
            />
          </label>
        </div>
      ) : null}

      <MyResultsPanel studentId={effectiveStudentId} sessionId={sessionParam} />
    </section>
  )
}

export function ResultsPage() {
  const { hasPermission } = useAuth()
  const canViewStaff = hasPermission(RESULT_VIEW)
  const canGenerate = hasPermission(RESULT_GENERATE)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader />
      {canViewStaff ? (
        <StaffResultsPage canGenerate={canGenerate} />
      ) : (
        <SelfResultsPage />
      )}
    </div>
  )
}
