"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Award,
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
import { EXAM_TYPE_LABELS } from "@/types/exam"
import type { ResultPassFilter, ResultSearchParams } from "@/types/result"
import { ListPager } from "@/components/list-pager"
import { StatusBadge } from "@/components/status-badge"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import { MyResultsPanel, ResultBundlePanel, ResultsSkeleton } from "./result-bundle-panel"
import { RESULT_GENERATE, RESULT_VIEW } from "./permissions"

type StaffView = "search" | "exam" | "annual"
type SearchMode = "admission" | "coordinates"

const STAFF_VIEWS: Array<{
  value: StaffView
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: "search", label: "Student search", icon: FileSearch },
  { value: "exam", label: "Exam results", icon: BookOpenCheck },
  { value: "annual", label: "Annual actions", icon: GraduationCap },
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
    raw === "exam" || raw === "annual" || raw === "search" ? raw : "search"

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

function StaffSearchPanel() {
  const [mode, setMode] = React.useState<SearchMode>("admission")
  const [admissionNo, setAdmissionNo] = React.useState("")
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)
  const [rollNo, setRollNo] = React.useState("")
  const [submitted, setSubmitted] = React.useState<ResultSearchParams | null>(
    null
  )

  const query = useResultSearch(submitted ?? {}, submitted !== null)

  const canSubmit =
    mode === "admission"
      ? admissionNo.trim().length > 0
      : Boolean(sessionId && classId && sectionId && rollNo.trim())

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_10rem_auto]">
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
                <ClassSelect
                  value={classId}
                  onValueChange={(next) => {
                    setClassId(next)
                    setSectionId(null)
                  }}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Section
                </span>
                <SectionSelect
                  classId={classId}
                  value={sectionId}
                  onValueChange={setSectionId}
                />
              </label>
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
        <ResultBundlePanel bundle={query.data} />
      )}
    </section>
  )
}

function ExamResultsPanel({ canGenerate }: { canGenerate: boolean }) {
  const [examId, setExamId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)
  const [passFilter, setPassFilter] = React.useState<ResultPassFilter>("all")
  const [page, setPage] = React.useState(1)
  const [confirm, setConfirm] = React.useState<"generate" | "publish" | null>(
    null
  )

  const exams = useExams({ page: 1, per_page: 100 })
  const rows = useExamResults(
    { exam_id: examId, section_id: sectionId, is_passed: passFilter, page },
    Boolean(examId)
  )
  const generate = useGenerateExamResults()
  const publish = usePublishExamResults()

  const examOptions =
    exams.data?.data.map((exam) => ({
      value: exam.id,
      label: `${exam.name} - ${EXAM_TYPE_LABELS[exam.type] ?? exam.type}`,
    })) ?? []

  async function runConfirmed() {
    if (!examId || !confirm) return

    try {
      if (confirm === "generate") {
        const result = await generate.mutateAsync(examId)
        toastSuccess(
          `Generated ${result.generated} exam result${result.generated === 1 ? "" : "s"}.`,
          { id: "results-exam-generate" }
        )
      } else {
        const result = await publish.mutateAsync(examId)
        toastSuccess(
          `Published ${result.published} exam result${result.published === 1 ? "" : "s"}.`,
          { id: "results-exam-publish" }
        )
      }
    } catch (error) {
      toastError(error, "Result action failed.", { id: "results-exam-action" })
      throw error
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_12rem_auto]">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Exam
            </span>
            <AcademicSelect
              value={examId}
              onValueChange={(next) => {
                setExamId(next)
                setPage(1)
              }}
              options={examOptions}
              isLoading={exams.isPending}
              isError={exams.isError}
              placeholder="Select exam"
              emptyPlaceholder="No exams"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Class for section filter
            </span>
            <ClassSelect
              value={classId}
              onValueChange={(next) => {
                setClassId(next)
                setSectionId(null)
                setPage(1)
              }}
              placeholder="Optional class"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
              Section
            </span>
            <SectionSelect
              classId={classId}
              value={sectionId}
              onValueChange={(next) => {
                setSectionId(next)
                setPage(1)
              }}
              placeholder="All sections"
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
          <div className="flex flex-wrap gap-2 self-end">
            <Button
              type="button"
              variant="outline"
              disabled={!canGenerate || !examId}
              onClick={() => setConfirm("generate")}
            >
              <Send className="size-4" aria-hidden />
              Generate
            </Button>
            <Button
              type="button"
              disabled={!canGenerate || !examId}
              onClick={() => setConfirm("publish")}
            >
              <ShieldCheck className="size-4" aria-hidden />
              Publish
            </Button>
          </div>
        </div>
        {!canGenerate ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-copy-muted">
            <Lock className="size-4" aria-hidden />
            You can browse results, but result generation requires additional
            permission.
          </p>
        ) : null}
      </div>

      {!examId ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Select an exam"
          description="Choose an exam to browse generated result rows."
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
          description="Generate results for this exam, or adjust the filters."
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
                      {row.name_en || "-"}
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
                      {row.name_en || "-"}
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

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "publish" ? "Publish exam results?" : "Generate exam results?"}
        description={
          confirm === "publish"
            ? "This stamps the generated rows as published and freezes the exam results."
            : "This regenerates result rows from the marks currently saved for this exam."
        }
        confirmLabel={confirm === "publish" ? "Publish results" : "Generate results"}
        pendingLabel={confirm === "publish" ? "Publishing..." : "Generating..."}
        onConfirm={runConfirmed}
      />
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
        <ExamResultsPanel canGenerate={canGenerate} />
      ) : (
        <AnnualActionsPanel canGenerate={canGenerate} />
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
