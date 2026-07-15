"use client"

/**
 * Multi-subject mark entry (task 4.2, "Multi-Subject Mark Entry" design).
 *
 * Pick exam → semester → class → section and the whole grid loads: every
 * subject of the class as columns, every active student as a row. The exam
 * picker lists distinct exam *names*; the semester picker then offers the
 * `type` variants that exist under that name, and the pair resolves to the
 * actual exam record. Two views share the same
 * draft — a **Matrix grid** (all subjects at once, with frozen Student / Total /
 * GPA / Result columns) and a dense **By subject** table (one subject, with a
 * per-student absent toggle). Search filters by roll or name; the roster
 * paginates client-side over the loaded grid.
 *
 * Grade + grade-point are **server-owned**: as a mark is typed, the grade shown
 * is the band the API's grading scale (`GET /grading-scales`) assigns — the
 * client never invents thresholds. Totals / GPA / pass-rate / the stats bar are
 * client-side *previews* aggregated from those server-resolved grade points; the
 * authoritative result is generated server-side (task 4.3).
 *
 * Saving is per-subject under the hood (`POST /exams/{id}/marks` owns the
 * published-freeze `409`, range `422` keyed per row, and the teacher-assignment
 * `403`); "Save draft" persists every entered subject, "Publish results" saves
 * then locks the exam (`POST .../marks/publish`), and "Unlock to edit" reopens
 * it (`POST .../marks/unpublish`). All four states (loading / empty / error /
 * loaded) are present.
 */

import * as React from "react"
import Link from "next/link"
import {
  ClipboardPen,
  Eraser,
  Lock,
  Pencil,
  Save,
  Search,
  Send,
  Table2,
  UserX,
  Users,
} from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { TableSkeleton } from "@/components/skeletons"
import { FormBanner } from "@/components/academic/management/form-helpers"
import {
  AcademicSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/academic"
import { useExams } from "@/hooks/exams"
import {
  useGradingScale,
  useMarkMatrix,
  usePublishMarks,
  useSaveMarks,
  useUnpublishMarks,
} from "@/hooks/marks"
import { isValidationError } from "@/lib/api"
import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast"
import type { PaginationMeta } from "@/types/api"
import {
  EXAM_TYPE_LABELS,
  EXAM_TYPES,
  isExamPublished,
  type Exam,
  type ExamType,
} from "@/types/exam"
import {
  resolveGrade,
  type GradingBand,
  type MarkMatrix,
  type MatrixStudent,
  type MatrixSubject,
  type ResolvedGrade,
} from "@/types/mark"

const EMPTY = "—"

/** Roster rows shown per page (client-side over the loaded grid). */
const PAGE_SIZE = 12

/** Exams pulled into the picker — enough to cover a branch's active set. */
const EXAM_OPTIONS_LIMIT = 100

type ViewMode = "matrix" | "subject"

/** One editable cell of the draft (a student × subject intersection). */
interface CellDraft {
  value: string
  absent: boolean
}

/** Draft keyed by `enrollment_id::subject_id`. */
type Draft = Record<string, CellDraft>

/** Per-cell validation message, keyed like the draft. */
type CellErrors = Record<string, string>

function cellKey(enrollmentId: string, subjectId: string): string {
  return `${enrollmentId}::${subjectId}`
}

function getCell(draft: Draft, key: string): CellDraft {
  return draft[key] ?? { value: "", absent: false }
}

type Tone = "success" | "info" | "warning" | "error" | "neutral"

/**
 * Tone for a server-resolved grade — display only. Fails are error; otherwise
 * the grade point bands it (high → success, mid → info, low → warning). The
 * thresholds here only pick a *color*; the grade itself comes from the API.
 */
function gradeTone(grade: ResolvedGrade | null): Tone {
  if (!grade) return "neutral"
  if (grade.is_fail) return "error"
  const gp = Number(grade.grade_point)
  if (gp >= 4) return "success"
  if (gp >= 3) return "info"
  return "warning"
}

const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  error: "text-error",
  neutral: "text-copy-muted",
}

const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/20",
  info: "bg-info/10 text-info border-info/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  neutral: "bg-subtle text-copy-secondary border-surface-border",
}

const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  error: "bg-error",
  neutral: "bg-copy-muted",
}

/** Outcome of one student row, derived from the draft (preview only). */
type RowResult = "pass" | "fail" | "absent" | "pending"

const RESULT_LABEL: Record<RowResult, string> = {
  pass: "Pass",
  fail: "Fail",
  absent: "Absent",
  pending: "Pending",
}

const RESULT_TONE: Record<RowResult, Tone> = {
  pass: "success",
  fail: "error",
  absent: "neutral",
  pending: "neutral",
}

/** Parse a raw mark to a number within the subject's range, else null. */
function toScore(value: string, fullMarks: number): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > fullMarks) return null
  return parsed
}

/** Aggregates for one student across all subjects (preview). */
interface RowSummary {
  total: number | null
  gpa: number | null
  result: RowResult
}

function summarize(
  student: MatrixStudent,
  subjects: MatrixSubject[],
  draft: Draft,
  scale: GradingBand[] | undefined
): RowSummary {
  let total = 0
  let enteredCount = 0
  let absentCount = 0
  let gpaSum = 0
  let anyFail = false
  let complete = true

  subjects.forEach((subject) => {
    const cell = getCell(draft, cellKey(student.enrollment_id, subject.id))
    if (cell.absent) {
      // an absent cell counts toward GPA as a fail (0 point)
      const grade = resolveGrade(0, scale)
      if (grade) gpaSum += Number(grade.grade_point)
      enteredCount += 1
      absentCount += 1
      anyFail = true
      return
    }
    const score = toScore(cell.value, subject.full_marks)
    if (score == null) {
      complete = false
      return
    }
    total += score
    enteredCount += 1
    const grade = resolveGrade(score, scale)
    if (grade) {
      gpaSum += Number(grade.grade_point)
      if (grade.is_fail) anyFail = true
    }
  })

  const entered = enteredCount > 0
  const allAbsent = absentCount === subjects.length && subjects.length > 0
  let result: RowResult = "pending"
  if (allAbsent) result = "absent"
  else if (anyFail) result = "fail"
  else if (complete && entered) result = "pass"

  return {
    total: entered ? total : null,
    gpa: entered ? gpaSum / enteredCount : null,
    result,
  }
}

export function MarkEntryGrid() {
  // Marks are scoped to the globally-active branch (attached as a query param by
  // the API interceptor); switching the navbar branch re-scopes this grid.
  const [examName, setExamName] = React.useState<string | null>(null)
  const [semester, setSemester] = React.useState<ExamType | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)

  const [view, setView] = React.useState<ViewMode>("matrix")
  const [selSubject, setSelSubject] = React.useState(0)
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [draft, setDraft] = React.useState<Draft>({})
  const [cellErrors, setCellErrors] = React.useState<CellErrors>({})
  const [banner, setBanner] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const examsQuery = useExams({
    page: 1,
    per_page: EXAM_OPTIONS_LIMIT,
  })
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
  const examId = selectedExam?.id ?? null

  const gradingQuery = useGradingScale()
  const scale = gradingQuery.data

  const matrixQuery = useMarkMatrix({
    exam_id: examId,
    class_id: classId,
    section_id: sectionId,
  })
  const matrix = matrixQuery.data

  const saveMarks = useSaveMarks(examId)
  const publishMarks = usePublishMarks(examId)
  const unpublishMarks = useUnpublishMarks(examId)

  const locked = matrix
    ? matrix.exam.status === "published"
    : selectedExam
      ? isExamPublished(selectedExam)
      : false

  // Section is an optional filter; the grid loads once exam + class are chosen.
  const isReady = examId != null && classId != null

  // Seed the draft from the loaded grid whenever its identity changes, so a
  // re-loaded exam/section shows the marks already entered for editing.
  React.useEffect(() => {
    if (!matrix) return
    const seeded: Draft = {}
    for (const student of matrix.students) {
      for (const cell of student.marks) {
        seeded[cellKey(student.enrollment_id, cell.subject_id)] = {
          value: cell.obtained_marks != null ? String(cell.obtained_marks) : "",
          absent: cell.is_absent,
        }
      }
    }
    setDraft(seeded)
    setCellErrors({})
    setBanner(null)
    setPage(1)
    setSelSubject(0)
  }, [matrix])

  // When the active branch changes (super admin), the exam list re-scopes.
  // Drop a selection that is no longer in it so the grid can't keep showing
  // another branch's exam.
  React.useEffect(() => {
    if (examName == null || examsQuery.data == null) return
    if (!exams.some((exam) => exam.name === examName)) {
      setExamName(null)
      setSemester(null)
      setClassId(null)
      setSectionId(null)
      setDraft({})
      setCellErrors({})
      setBanner(null)
      setQuery("")
      setPage(1)
    }
  }, [exams, examsQuery.data, examName])

  function resetSelection() {
    setDraft({})
    setCellErrors({})
    setBanner(null)
    setQuery("")
    setPage(1)
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
    resetSelection()
  }
  function changeSemester(value: ExamType | null) {
    setSemester(value)
    setClassId(null)
    setSectionId(null)
    resetSelection()
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setSectionId(null)
    resetSelection()
  }
  function changeSection(value: string | null) {
    setSectionId(value)
    resetSelection()
  }

  function setCell(key: string, next: Partial<CellDraft>) {
    setDraft((prev) => ({ ...prev, [key]: { ...getCell(prev, key), ...next } }))
    setCellErrors((prev) => {
      if (!(key in prev)) return prev
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }
  function setMark(key: string, value: string) {
    setCell(key, { value, absent: false })
  }
  function toggleAbsent(key: string) {
    const current = getCell(draft, key)
    setCell(key, { absent: !current.absent, value: "" })
  }

  // Filter by roll number or name, then paginate the loaded roster.
  const filtered = React.useMemo(() => {
    const students = matrix?.students ?? []
    const q = query.trim().toLowerCase()
    if (!q) return students
    const digits = /^\d+$/.test(q)
    return students.filter((student) => {
      const name = (student.name_en ?? "").toLowerCase()
      if (name.includes(q)) return true
      const roll = String(student.roll_no ?? "")
      if (digits) return roll === q || roll.padStart(2, "0") === q
      return false
    })
  }, [matrix, query])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, lastPage)
  const start = (safePage - 1) * PAGE_SIZE
  const pageStudents = filtered.slice(start, start + PAGE_SIZE)

  React.useEffect(() => {
    setPage((current) => Math.min(current, lastPage))
  }, [lastPage])

  const pagerMeta: PaginationMeta = {
    current_page: safePage,
    per_page: PAGE_SIZE,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + PAGE_SIZE, total),
    total,
    last_page: lastPage,
  }

  /** Persist every entered subject; returns whether all subjects saved. */
  async function persist(): Promise<boolean> {
    if (!matrix) return false
    setBanner(null)
    setCellErrors({})

    if (locked) {
      setBanner("Marks are frozen for published exams. Unlock to edit.")
      return false
    }

    // Group the draft into one payload per subject; keep row order so a per-row
    // 422 (`marks.{i}`) maps back to its cell.
    const localErrors: CellErrors = {}
    const payloads: {
      subjectId: string
      rows: { enrollment_id: string; obtained_marks?: number; is_absent?: boolean }[]
      keys: string[]
    }[] = []

    for (const subject of matrix.subjects) {
      const rows: {
        enrollment_id: string
        obtained_marks?: number
        is_absent?: boolean
      }[] = []
      const keys: string[] = []
      for (const student of matrix.students) {
        const key = cellKey(student.enrollment_id, subject.id)
        const cell = getCell(draft, key)
        if (cell.absent) {
          rows.push({ enrollment_id: student.enrollment_id, is_absent: true })
          keys.push(key)
        } else if (cell.value.trim() !== "") {
          const num = Number(cell.value.trim())
          if (!Number.isFinite(num)) {
            localErrors[key] = "Enter a number."
            continue
          }
          rows.push({ enrollment_id: student.enrollment_id, obtained_marks: num })
          keys.push(key)
        }
      }
      if (rows.length > 0) payloads.push({ subjectId: subject.id, rows, keys })
    }

    if (Object.keys(localErrors).length > 0) {
      setCellErrors(localErrors)
      setBanner("Some marks aren't valid numbers — fix the highlighted cells.")
      return false
    }
    if (payloads.length === 0) {
      setBanner("Enter a mark for at least one student before saving.")
      return false
    }

    setIsSaving(true)
    const mapped: CellErrors = {}
    let savedTotal = 0
    let firstError: unknown = null

    for (const { subjectId, rows, keys } of payloads) {
      try {
        const result = await saveMarks.mutateAsync({
          subject_id: subjectId,
          marks: rows,
        })
        savedTotal += result.saved
      } catch (error) {
        if (firstError == null) firstError = error
        if (isValidationError(error)) {
          rows.forEach((_, index) => {
            const message =
              error.first(`marks.${index}.obtained_marks`) ??
              error.first(`marks.${index}.enrollment_id`)
            if (message) mapped[keys[index] as string] = message
          })
          setBanner(error.first("subject_id") ?? error.message)
        } else {
          setBanner(getErrorMessage(error, "Couldn't save marks."))
        }
      }
    }

    setIsSaving(false)
    setCellErrors(mapped)

    if (firstError != null) {
      toastError(firstError, "Couldn't save all marks.", { id: "marks-save" })
      return false
    }

    toastSuccess(`Saved ${savedTotal} marks.`, { id: "marks-save" })
    await matrixQuery.refetch()
    return true
  }

  async function onSaveDraft() {
    await persist()
  }

  async function onPublish() {
    const ok = await persist()
    if (!ok) return
    try {
      await publishMarks.mutateAsync()
      toastSuccess("Results published & locked.", { id: "marks-lock" })
      await matrixQuery.refetch()
    } catch (error) {
      setBanner(getErrorMessage(error, "Couldn't publish results."))
      toastError(error, "Couldn't publish results.", { id: "marks-lock" })
    }
  }

  async function onUnlock() {
    try {
      await unpublishMarks.mutateAsync()
      toastSuccess("Unlocked for editing.", { id: "marks-lock" })
      await matrixQuery.refetch()
    } catch (error) {
      toastError(error, "Couldn't unlock the exam.", { id: "marks-lock" })
    }
  }

  function onClear() {
    if (!matrix) return
    const cleared: Draft = {}
    for (const student of matrix.students) {
      for (const cell of student.marks) {
        cleared[cellKey(student.enrollment_id, cell.subject_id)] = {
          value: "",
          absent: false,
        }
      }
    }
    setDraft(cleared)
    setCellErrors({})
    setBanner(null)
    toastSuccess("Entries cleared — save to apply.", { id: "marks-clear" })
  }

  const busy = isSaving || publishMarks.isPending || unpublishMarks.isPending

  return (
    <div className="flex flex-col gap-4">
      {/* Page header + breadcrumb + selectors */}
      <div className="flex flex-col gap-5">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-copy-muted">
            <span>Examinations</span>
            <span aria-hidden>›</span>
            <span className="text-copy-secondary">
              {examName ?? "Select an exam"}
            </span>
            <span aria-hidden>›</span>
            <span className="font-semibold text-copy-secondary">
              Mark entry · All subjects
            </span>
          </nav>
          <h1 className="mt-2 truncate text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-copy-primary">
            Mark entry — all subjects
          </h1>
          <p className="mt-1.5 text-[15px] text-copy-muted">
            Enter every subject for the class in one grid. Totals, GPA and result
            update automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[760px] lg:grid-cols-4">
          <Field label="Exam">
            <AcademicSelect
              value={examName}
              onValueChange={changeExam}
              options={examNames.map((name) => ({
                value: name,
                label: name,
              }))}
              isLoading={examsQuery.isPending}
              isError={examsQuery.isError}
              placeholder="Select exam"
              emptyPlaceholder="No exams"
              aria-label="Select exam"
            />
          </Field>
          <Field label="Semester">
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
              aria-label="Select semester"
            />
          </Field>
          <Field label="Class">
            <ClassPicker
              exam={selectedExam}
              value={classId}
              onValueChange={changeClass}
            />
          </Field>
          <Field label="Section">
            <SectionSelect
              classId={classId}
              value={sectionId}
              onValueChange={changeSection}
              clearLabel="All sections"
              placeholder="All sections"
              aria-label="Select section"
            />
          </Field>
        </div>
      </div>

      {/* Published / locked banner */}
      {locked ? (
        <div className="flex flex-col gap-3 rounded-xl border border-success/20 bg-success/10 p-4 sm:flex-row sm:items-center">
          <Lock className="size-5 shrink-0 text-success" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold text-success">
              Results published &amp; locked
            </p>
            <p className="text-sm text-success/80">
              Marks are frozen across all subjects. Unlock to make corrections.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onUnlock}
            loading={unpublishMarks.isPending}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            <Pencil className="size-4" aria-hidden />
            Unlock to edit
          </Button>
        </div>
      ) : null}

      <FormBanner message={banner} />

      {!isReady ? (
        <EmptyState
          icon={ClipboardPen}
          title="Choose an exam and class"
          description="The multi-subject grid loads once an exam and class are selected. Pick a section to narrow the roster (optional)."
        />
      ) : matrixQuery.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : matrixQuery.isError ? (
        <ErrorPanel
          description={getErrorMessage(
            matrixQuery.error,
            "We couldn't load the marks grid."
          )}
          onRetry={() => void matrixQuery.refetch()}
        />
      ) : !matrix || matrix.students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students in this section"
          description="The API did not return any active students for this section."
        />
      ) : matrix.subjects.length === 0 ? (
        <EmptyState
          icon={ClipboardPen}
          title="No subjects for this class"
          description="Add subjects to the class before entering marks."
        />
      ) : (
        <>
          <StatsBar matrix={matrix} draft={draft} scale={scale} />

          {/* Toolbar: view toggle + search, then actions on their own row */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <div className="inline-flex gap-1 rounded-[11px] bg-subtle p-1">
                <SegButton
                  active={view === "matrix"}
                  onClick={() => setView("matrix")}
                  icon={Table2}
                  label="Matrix grid"
                />
                <SegButton
                  active={view === "subject"}
                  onClick={() => setView("subject")}
                  icon={ClipboardPen}
                  label="By subject"
                />
              </div>
              <div className="relative sm:w-[230px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search name or roll…"
                  aria-label="Search students by roll or name"
                  className="h-10 rounded-[10px] bg-surface pl-9 text-[14px]"
                />
              </div>
            </div>

            {!locked ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClear}
                  disabled={busy}
                  className="h-[38px] rounded-[9px] px-3.5 text-[13.5px] font-semibold"
                >
                  <Eraser className="size-4" aria-hidden />
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveDraft}
                  loading={isSaving}
                  disabled={busy}
                  className="h-[38px] rounded-[9px] px-4 text-[13.5px] font-semibold"
                >
                  <Save className="size-4" aria-hidden />
                  Save draft
                </Button>
                <Button
                  type="button"
                  onClick={onPublish}
                  loading={publishMarks.isPending}
                  disabled={busy}
                  className="h-[38px] rounded-[9px] px-[18px] text-[13.5px] font-semibold"
                >
                  <Send className="size-4" aria-hidden />
                  Publish results
                </Button>
              </div>
            ) : null}
          </div>

          {total === 0 ? (
            <EmptyState
              icon={Search}
              title="No students match your search"
              description={`Nothing matched “${query}”. Clear the search to see the full roster.`}
            />
          ) : view === "matrix" ? (
            <MatrixView
              subjects={matrix.subjects}
              students={pageStudents}
              draft={draft}
              cellErrors={cellErrors}
              scale={scale}
              locked={locked}
              allStudents={matrix.students}
              onMark={setMark}
              meta={pagerMeta}
              page={safePage}
              lastPage={lastPage}
              onPage={setPage}
              busy={busy || matrixQuery.isFetching}
            />
          ) : (
            <SubjectView
              subjects={matrix.subjects}
              selected={selSubject}
              onSelect={setSelSubject}
              students={pageStudents}
              allStudents={matrix.students}
              draft={draft}
              cellErrors={cellErrors}
              scale={scale}
              locked={locked}
              onMark={setMark}
              onToggleAbsent={toggleAbsent}
              meta={pagerMeta}
              page={safePage}
              lastPage={lastPage}
              onPage={setPage}
              busy={busy || matrixQuery.isFetching}
            />
          )}

          <GradingLegend scale={scale} />
        </>
      )}
    </div>
  )
}

/* ------------------------------- stats bar ------------------------------- */

function StatsBar({
  matrix,
  draft,
  scale,
}: {
  matrix: MarkMatrix
  draft: Draft
  scale: GradingBand[] | undefined
}) {
  const stats = React.useMemo(() => {
    const { subjects, students } = matrix
    const totalCells = students.length * subjects.length
    let enteredCells = 0
    let pctSum = 0
    let pctCount = 0
    const gpas: number[] = []
    let passCount = 0
    let failCount = 0
    let absentStudents = 0

    students.forEach((student) => {
      subjects.forEach((subject) => {
        const cell = getCell(draft, cellKey(student.enrollment_id, subject.id))
        if (cell.absent) {
          enteredCells += 1
          return
        }
        const score = toScore(cell.value, subject.full_marks)
        if (score != null) {
          enteredCells += 1
          pctSum += (score / subject.full_marks) * 100
          pctCount += 1
        }
      })

      const summary = summarize(student, subjects, draft, scale)
      if (summary.gpa != null) gpas.push(summary.gpa)
      if (summary.result === "pass") passCount += 1
      else if (summary.result === "fail") failCount += 1
      else if (summary.result === "absent") absentStudents += 1
    })

    const graded = passCount + failCount
    return {
      cellsText: `${enteredCells}/${totalCells}`,
      barPct: totalCells ? Math.round((enteredCells / totalCells) * 100) : 0,
      avg: pctCount ? `${(pctSum / pctCount).toFixed(1)}%` : EMPTY,
      topGpa: gpas.length ? Math.max(...gpas).toFixed(2) : EMPTY,
      passRate: graded ? `${Math.round((passCount / graded) * 100)}%` : EMPTY,
      failCount: String(failCount),
      absent: String(absentStudents),
    }
  }, [matrix, draft, scale])

  return (
    <section className="flex flex-wrap items-center gap-x-[26px] gap-y-4 rounded-xl border border-surface-border bg-surface px-6 py-5 shadow-sm">
      <div className="flex min-w-44 flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[26px] font-bold tracking-[-0.02em] tabular-nums text-copy-primary">
            {stats.cellsText}
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-copy-muted">
            Marks entered
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${stats.barPct}%` }}
          />
        </div>
      </div>
      <div className="hidden h-[42px] w-px bg-surface-border sm:block" aria-hidden />
      <Stat label="Class avg" value={stats.avg} />
      <Stat label="Top GPA" value={stats.topGpa} accent />
      <Stat label="Pass rate" value={stats.passRate} tone="success" />
      <Stat label="Failing" value={stats.failCount} tone="error" />
      <Stat label="Absent" value={stats.absent} />
    </section>
  )
}

function Stat({
  label,
  value,
  tone = "neutral",
  accent = false,
}: {
  label: string
  value: string
  tone?: Tone
  /** Render the value in the brand accent (e.g. Top GPA). */
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "font-mono text-[22px] font-bold tracking-[-0.02em] tabular-nums",
          accent
            ? "text-brand"
            : tone === "neutral"
              ? "text-copy-primary"
              : TONE_TEXT[tone]
        )}
      >
        {value}
      </span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-copy-muted">
        {label}
      </span>
    </div>
  )
}

/* ------------------------------ matrix view ------------------------------ */

function MatrixView({
  subjects,
  students,
  allStudents,
  draft,
  cellErrors,
  scale,
  locked,
  onMark,
  meta,
  page,
  lastPage,
  onPage,
  busy,
}: {
  subjects: MatrixSubject[]
  students: MatrixStudent[]
  allStudents: MatrixStudent[]
  draft: Draft
  cellErrors: CellErrors
  scale: GradingBand[] | undefined
  locked: boolean
  onMark: (key: string, value: string) => void
  meta: PaginationMeta
  page: number
  lastPage: number
  onPage: (page: number) => void
  busy: boolean
}) {
  const rollOrder = students.map((s) => s.enrollment_id)

  function focusCell(enrollmentId: string | undefined, col: number) {
    if (enrollmentId == null) return
    const safeCol = Math.max(0, Math.min(subjects.length - 1, col))
    const subject = subjects[safeCol]
    if (!subject) return
    const el = document.getElementById(
      `mx-${enrollmentId}-${subject.id}`
    ) as HTMLInputElement | null
    if (el && !el.readOnly) {
      el.focus()
      el.select()
    }
  }

  function onKey(
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    col: number
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault()
      focusCell(rollOrder[rowIndex], col + 1)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusCell(rollOrder[rowIndex], col - 1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      focusCell(rollOrder[rowIndex - 1], col)
    } else if (event.key === "ArrowDown" || event.key === "Enter") {
      event.preventDefault()
      focusCell(rollOrder[rowIndex + 1], col)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm"
      aria-busy={busy}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[200px] border-b border-r border-surface-border bg-subtle px-[18px] py-[13px] text-left text-[11.5px] font-semibold uppercase tracking-[0.05em] text-copy-muted">
                Student
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  className="min-w-[78px] border-b border-r border-subtle bg-subtle px-2 py-2.5 text-center"
                >
                  <div className="text-[11.5px] font-bold tracking-[0.04em] text-copy-secondary">
                    {subject.code || subject.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-copy-muted">
                    /{subject.full_marks}
                  </div>
                </th>
              ))}
              <StickyHeadCell className="w-[88px] text-right" style={{ right: 168 }}>
                Total
              </StickyHeadCell>
              <StickyHeadCell className="w-16 text-center" style={{ right: 104 }}>
                GPA
              </StickyHeadCell>
              <StickyHeadCell className="w-[104px] text-center" style={{ right: 0 }}>
                Result
              </StickyHeadCell>
            </tr>
          </thead>
          <tbody>
            {students.map((student, rowIndex) => {
              const summary = summarize(student, subjects, draft, scale)
              const rowFail = summary.result === "fail"
              return (
                <tr
                  key={student.enrollment_id}
                  className={cn(rowFail && "bg-error/[0.05]")}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-b border-r border-surface-border px-4 py-2",
                      rowFail ? "bg-error/[0.05]" : "bg-surface"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 font-mono text-[13px] text-copy-muted">
                        {formatRoll(student.roll_no)}
                      </span>
                      <div className="min-w-0">
                        <StudentNameLink
                          student={student}
                          className="truncate text-[14px] font-semibold tracking-tight text-copy-primary"
                        />
                        {student.sid ? (
                          <div className="truncate font-mono text-[11.5px] text-copy-muted">
                            {student.sid}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {subjects.map((subject, col) => {
                    const key = cellKey(student.enrollment_id, subject.id)
                    const cell = getCell(draft, key)
                    const error = cellErrors[key]
                    const score = toScore(cell.value, subject.full_marks)
                    const fail = score != null && resolveGrade(score, scale)?.is_fail
                    return (
                      <td
                        key={subject.id}
                        className="border-b border-r border-subtle p-1.5 text-center"
                      >
                        <input
                          id={`mx-${student.enrollment_id}-${subject.id}`}
                          type="text"
                          inputMode="numeric"
                          readOnly={locked}
                          value={cell.absent ? "" : cell.value}
                          placeholder={cell.absent ? "AB" : "·"}
                          aria-invalid={error ? true : undefined}
                          aria-label={`${subject.name} marks for ${student.name_en ?? "student"}`}
                          onChange={(event) => onMark(key, event.target.value)}
                          onKeyDown={(event) => onKey(event, rowIndex, col)}
                          className={cn(
                            "h-[38px] w-[60px] rounded-[10px] border bg-surface text-center font-mono text-[15px] font-bold tabular-nums text-copy-primary outline-none transition-colors placeholder:font-normal placeholder:text-copy-muted",
                            "focus:border-brand focus:ring-2 focus:ring-brand/20",
                            error
                              ? "border-error text-error"
                              : fail
                                ? "border-error/50 text-error"
                                : "border-surface-border",
                            cell.absent && "bg-subtle text-copy-muted",
                            locked && "cursor-not-allowed opacity-70"
                          )}
                        />
                      </td>
                    )
                  })}
                  <StickyCell
                    className={cn("text-right", rowFail && "bg-error/[0.05]")}
                    style={{ right: 168 }}
                  >
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums",
                        summary.total == null
                          ? "text-copy-muted"
                          : "text-copy-primary"
                      )}
                    >
                      {summary.total == null ? EMPTY : summary.total}
                    </span>
                  </StickyCell>
                  <StickyCell
                    className={cn("text-center", rowFail && "bg-error/[0.05]")}
                    style={{ right: 104 }}
                  >
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums",
                        summary.gpa == null ? "text-copy-muted" : "text-brand"
                      )}
                    >
                      {summary.gpa == null ? EMPTY : summary.gpa.toFixed(2)}
                    </span>
                  </StickyCell>
                  <StickyCell
                    className={cn("text-center", rowFail && "bg-error/[0.05]")}
                    style={{ right: 0 }}
                  >
                    <ResultChip result={summary.result} />
                  </StickyCell>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 border-r border-t border-surface-border bg-subtle px-[18px] py-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-copy-muted">
                Subject average
              </td>
              {subjects.map((subject) => {
                const stat = subjectStat(subject, allStudents, draft, scale)
                return (
                  <td
                    key={subject.id}
                    className="border-r border-t border-subtle bg-subtle px-2 py-3 text-center"
                  >
                    <div
                      className={cn(
                        "font-mono text-[14px] font-bold tabular-nums",
                        stat.avg == null
                          ? "text-copy-muted"
                          : "text-copy-primary"
                      )}
                    >
                      {stat.avg == null ? EMPTY : stat.avg.toFixed(1)}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-copy-muted">
                      {stat.note}
                    </div>
                  </td>
                )
              })}
              <td
                className="sticky z-10 border-t border-surface-border bg-subtle"
                style={{ right: 168 }}
              />
              <td
                className="sticky z-10 border-t border-surface-border bg-subtle"
                style={{ right: 104 }}
              />
              <td
                className="sticky z-10 border-t border-surface-border bg-subtle"
                style={{ right: 0 }}
              />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="border-t border-surface-border px-5 py-3.5">
        <ListPager
          meta={meta}
          page={page}
          lastPage={lastPage}
          unit="student"
          disabled={busy}
          onPage={onPage}
        />
      </div>
    </div>
  )
}

function StickyHeadCell({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <th
      style={style}
      className={cn(
        "sticky z-20 border-b border-l border-surface-border bg-subtle px-[14px] py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.05em] text-copy-muted",
        className
      )}
    >
      {children}
    </th>
  )
}

function StickyCell({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <td
      style={style}
      className={cn(
        "sticky z-10 border-b border-l border-surface-border bg-surface px-3 py-2",
        className
      )}
    >
      {children}
    </td>
  )
}

/* ------------------------------ subject view ----------------------------- */

function SubjectView({
  subjects,
  selected,
  onSelect,
  students,
  allStudents,
  draft,
  cellErrors,
  scale,
  locked,
  onMark,
  onToggleAbsent,
  meta,
  page,
  lastPage,
  onPage,
  busy,
}: {
  subjects: MatrixSubject[]
  selected: number
  onSelect: (index: number) => void
  students: MatrixStudent[]
  allStudents: MatrixStudent[]
  draft: Draft
  cellErrors: CellErrors
  scale: GradingBand[] | undefined
  locked: boolean
  onMark: (key: string, value: string) => void
  onToggleAbsent: (key: string) => void
  meta: PaginationMeta
  page: number
  lastPage: number
  onPage: (page: number) => void
  busy: boolean
}) {
  const subject = subjects[Math.min(selected, subjects.length - 1)] ?? subjects[0]
  if (!subject) return null
  const rollOrder = students.map((s) => s.enrollment_id)

  function focusRow(enrollmentId: string | undefined) {
    if (enrollmentId == null || !subject) return
    const el = document.getElementById(
      `sr-${enrollmentId}-${subject.id}`
    ) as HTMLInputElement | null
    if (el && !el.readOnly) {
      el.focus()
      el.select()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* subject pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map((sub, index) => {
          const progress = subjectStat(sub, allStudents, draft, scale)
          const active = sub.id === subject.id
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "flex min-w-[120px] shrink-0 flex-col gap-[3px] rounded-[11px] border px-4 py-2.5 text-left transition-colors",
                active
                  ? "border-brand bg-accent-dim"
                  : "border-surface-border bg-surface hover:border-brand/40"
              )}
            >
              <span
                className={cn(
                  "text-[14px] font-bold",
                  active ? "text-brand" : "text-copy-primary"
                )}
              >
                {sub.name}
              </span>
              <span
                className={cn(
                  "text-[11.5px] font-medium",
                  active ? "text-brand/80" : "text-copy-muted"
                )}
              >
                {progress.done}/{allStudents.length} entered
              </span>
            </button>
          )
        })}
      </div>

      <div
        className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm"
        aria-busy={busy}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-subtle text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-copy-muted">
                <th className="w-16 px-[18px] py-[13px]">Roll</th>
                <th className="px-[18px] py-[13px]">Student</th>
                <th className="w-40 px-[18px] py-[13px]">Score</th>
                <th className="w-20 px-[18px] py-[13px] text-right">%</th>
                <th className="w-24 px-[18px] py-[13px] text-center">Grade</th>
                <th className="w-20 px-[18px] py-[13px] text-right">Point</th>
                <th className="w-28 px-[18px] py-[13px] text-center">Status</th>
                <th className="w-20 px-[18px] py-[13px] text-center">Absent</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, rowIndex) => {
                const key = cellKey(student.enrollment_id, subject.id)
                const cell = getCell(draft, key)
                const error = cellErrors[key]
                const score = toScore(cell.value, subject.full_marks)
                const grade = cell.absent
                  ? resolveGrade(0, scale)
                  : resolveGrade(score, scale)
                const tone = gradeTone(grade)
                const pct =
                  score != null
                    ? `${Math.round((score / subject.full_marks) * 100)}%`
                    : EMPTY
                const status: RowResult = cell.absent
                  ? "absent"
                  : score == null
                    ? "pending"
                    : grade?.is_fail
                      ? "fail"
                      : "pass"
                return (
                  <tr
                    key={student.enrollment_id}
                    className="border-b border-subtle last:border-0"
                  >
                    <td className="px-[18px] py-2.5 font-mono text-[14px] text-copy-muted">
                      {formatRoll(student.roll_no)}
                    </td>
                    <td className="px-[18px] py-2.5">
                      <StudentNameLink
                        student={student}
                        className={cn(
                          "text-[14.5px] font-semibold tracking-tight",
                          cell.absent ? "text-copy-muted" : "text-copy-primary"
                        )}
                      />
                      {student.sid ? (
                        <div className="mt-px font-mono text-[12.5px] text-copy-muted">
                          {student.sid}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-[18px] py-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          id={`sr-${student.enrollment_id}-${subject.id}`}
                          type="text"
                          inputMode="numeric"
                          readOnly={locked || cell.absent}
                          value={cell.absent ? "" : cell.value}
                          placeholder={cell.absent ? "ABS" : "–"}
                          aria-invalid={error ? true : undefined}
                          aria-label={`Marks for ${student.name_en ?? "student"}`}
                          onChange={(event) => onMark(key, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === "ArrowDown") {
                              event.preventDefault()
                              focusRow(rollOrder[rowIndex + 1])
                            } else if (event.key === "ArrowUp") {
                              event.preventDefault()
                              focusRow(rollOrder[rowIndex - 1])
                            }
                          }}
                          className={cn(
                            "h-[38px] w-[62px] rounded-[10px] border bg-surface text-center font-mono text-[15px] font-bold tabular-nums text-copy-primary outline-none transition-colors placeholder:font-normal placeholder:text-copy-muted",
                            "focus:border-brand focus:ring-2 focus:ring-brand/20",
                            error
                              ? "border-error text-error"
                              : status === "fail"
                                ? "border-error/50 text-error"
                                : "border-surface-border",
                            cell.absent && "bg-subtle text-copy-muted",
                            locked && "cursor-not-allowed opacity-70"
                          )}
                        />
                        <span className="font-mono text-[13px] text-copy-muted">
                          / {subject.full_marks}
                        </span>
                      </div>
                      {error ? (
                        <p className="mt-1 text-xs text-error">{error}</p>
                      ) : null}
                    </td>
                    <td className="px-[18px] py-2.5 text-right font-mono text-[14px] font-semibold tabular-nums text-copy-secondary">
                      {pct}
                    </td>
                    <td className="px-[18px] py-2.5 text-center">
                      {grade && (cell.absent || score != null) ? (
                        <span
                          className={cn(
                            "inline-flex h-[26px] min-w-[38px] items-center justify-center rounded-lg border px-[9px] font-mono text-[13px] font-bold",
                            TONE_CHIP[tone]
                          )}
                        >
                          {grade.grade}
                        </span>
                      ) : (
                        <span className="text-copy-muted">{EMPTY}</span>
                      )}
                    </td>
                    <td className="px-[18px] py-2.5 text-right font-mono text-[14px] font-semibold tabular-nums text-copy-secondary">
                      {grade && (cell.absent || score != null)
                        ? Number(grade.grade_point).toFixed(2)
                        : EMPTY}
                    </td>
                    <td className="px-[18px] py-2.5 text-center">
                      <ResultChip result={status} />
                    </td>
                    <td className="px-[18px] py-2.5 text-center">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onToggleAbsent(key)}
                        title="Mark absent"
                        aria-pressed={cell.absent}
                        aria-label={`Toggle absent for ${student.name_en ?? "student"}`}
                        className={cn(
                          "inline-grid size-[34px] place-items-center rounded-[9px] border transition-colors",
                          cell.absent
                            ? "border-error bg-error text-white"
                            : "border-surface-border bg-surface text-copy-muted hover:bg-subtle",
                          locked && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <UserX className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-surface-border px-5 py-3.5">
          <ListPager
            meta={meta}
            page={page}
            lastPage={lastPage}
            unit="student"
            disabled={busy}
            onPage={onPage}
          />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- helpers -------------------------------- */

/**
 * Student name linking to the detail page's Results tab. Falls back to plain
 * text when the row carries no `student_id` (older API payloads).
 */
function StudentNameLink({
  student,
  className,
}: {
  student: MatrixStudent
  className?: string
}) {
  const name = student.name_en || EMPTY
  if (!student.student_id) return <div className={className}>{name}</div>
  return (
    <Link
      href={`/students/${student.student_id}?tab=results`}
      className={cn(
        "block rounded-sm outline-none hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand/40",
        className
      )}
    >
      {name}
    </Link>
  )
}

function ResultChip({ result }: { result: RowResult }) {
  const tone = RESULT_TONE[result]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-[11px] py-1 text-[12.5px] font-semibold",
        TONE_CHIP[tone]
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />
      {RESULT_LABEL[result]}
    </span>
  )
}

interface SubjectStat {
  avg: number | null
  done: number
  note: string
}

function subjectStat(
  subject: MatrixSubject,
  students: MatrixStudent[],
  draft: Draft,
  scale: GradingBand[] | undefined
): SubjectStat {
  let sum = 0
  let count = 0
  let done = 0
  let fails = 0
  students.forEach((student) => {
    const cell = getCell(draft, cellKey(student.enrollment_id, subject.id))
    if (cell.absent) {
      done += 1
      fails += 1
      return
    }
    const score = toScore(cell.value, subject.full_marks)
    if (score == null) return
    done += 1
    sum += score
    count += 1
    if (resolveGrade(score, scale)?.is_fail) fails += 1
  })
  return {
    avg: count ? sum / count : null,
    done,
    note: done ? (fails === 0 ? "all pass" : `${fails} fail`) : "no marks",
  }
}

function SegButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[7px] rounded-lg px-[15px] py-2 text-[13.5px] font-semibold transition-colors",
        active
          ? "bg-surface text-brand shadow-sm"
          : "text-copy-secondary hover:text-copy-primary"
      )}
    >
      <Icon className="size-[15px]" />
      {label}
    </button>
  )
}

function GradingLegend({ scale }: { scale: GradingBand[] | undefined }) {
  if (!scale || scale.length === 0) return null
  const ordered = [...scale].sort((a, b) => b.min_marks - a.min_marks)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-copy-secondary">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-copy-muted">
        Grading scale
      </span>
      {ordered.map((band) => {
        const tone = gradeTone({
          grade: band.grade,
          grade_point: band.grade_point,
          is_fail: band.is_fail,
        })
        return (
          <span key={band.grade} className="inline-flex items-center gap-1.5">
            <b className={cn("font-mono", TONE_TEXT[tone])}>{band.grade}</b>≥
            {band.min_marks} · {Number(band.grade_point).toFixed(2)}
          </span>
        )
      })}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-copy-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

/**
 * Class picker scoped to the chosen exam: an exam targeting an explicit set of
 * classes only offers those; an all-classes exam offers every class via the
 * shared `ClassSelect`. Disabled until an exam is chosen.
 */
function ClassPicker({
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
        aria-label="Select class"
      />
    )
  }

  return (
    <ClassSelect
      value={value}
      onValueChange={onValueChange}
      disabled={exam == null}
      aria-label="Select class"
    />
  )
}

/** Roll number padded to two digits for column alignment. */
function formatRoll(roll: string | number | null): string {
  if (roll == null || roll === "") return EMPTY
  const text = String(roll)
  return /^\d+$/.test(text) ? text.padStart(2, "0") : text
}
