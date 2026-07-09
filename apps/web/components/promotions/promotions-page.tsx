"use client"

/**
 * Promotion screen (task 4.5). Two surfaces: a **Promote** view that previews
 * eligible vs held students for a source (session, class), lets the user set the
 * target (session, class, section) and runs bulk or individual promotion; and a
 * **History** view listing past runs.
 *
 * Eligibility, the hold reason, and the next class are server-owned: the client
 * reads the preview verbatim, then sends the chosen scope to the API. Failed and
 * TC students are held/excluded by the API — both are reflected from the
 * preview, never decided here. Promoting a held student needs `promotion.override`.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowUpCircle,
  CheckCircle2,
  History,
  ListChecks,
  PauseCircle,
  Search,
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
import { cn } from "@workspace/ui/lib/utils"

import { AcademicSelect } from "@/components/academic/academic-select"
import { ClassSelect } from "@/components/academic/class-select"
import { SectionSelect } from "@/components/academic/section-select"
import { SessionSelect } from "@/components/academic/session-select"
import { useAuth } from "@/components/auth/auth-provider"
import { BranchSelect } from "@/components/branch/branch-select"
import { useBranch } from "@/components/branch/branch-provider"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { SelectCheckbox } from "@/components/select-checkbox"
import { StatusBadge } from "@/components/status-badge"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import { useClasses } from "@/hooks/academic"
import {
  usePromoteBulk,
  usePromotionHistory,
  usePromotionPreview,
} from "@/hooks/promotions"
import { toastError, toastSuccess } from "@/lib/toast"
import type { PaginationMeta } from "@/types/api"
import type {
  PromotionPreview,
  PromotionType,
  RollStrategy,
} from "@/types/promotion"
import {
  PromoteStudentDialog,
  type PromoteStudentTarget,
} from "./promote-student-dialog"
import {
  PROMOTION_OVERRIDE,
  PROMOTION_VIEW,
} from "./permissions"

type PromotionView = "promote" | "history"
type RowFilter = "all" | "eligible" | "held"

/** Preview rows shown per page (the whole cohort is paged locally). Matches the
 * app's list convention so page controls appear past one page of students. */
const PREVIEW_PAGE_SIZE = 15

/** A flattened preview row spanning both eligible and held students. */
interface PromotionRow {
  student_id: number | string
  name_en: string | null
  roll_no: number | string | null
  gpa: string | number | null
  is_eligible: boolean
  reason: string | null
}

const REASON_LABEL: Record<string, string> = {
  failed: "Failed",
  no_result: "No result",
  tc: "Transfer certificate",
}

const ROLL_STRATEGIES: Array<{ value: RollStrategy; label: string }> = [
  { value: "by_merit", label: "Reassign by merit (GPA rank)" },
  { value: "keep", label: "Keep current roll numbers" },
]

function formatFigure(value: string | number | null | undefined): string {
  if (value == null || value === "") return "-"
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toFixed(2)
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-copy-muted">
        <ArrowUpCircle className="size-4" aria-hidden />
        Exams and results
      </div>
      <div>
        <h1 className="text-[27px] font-bold tracking-[-0.025em] text-copy-primary">
          Promotion
        </h1>
        <p className="max-w-2xl text-sm text-copy-muted">
          Preview which students are eligible to move up versus held back, choose
          the target class and session, then promote a whole class or a single
          student. Eligibility and the next class are decided by the server.
        </p>
      </div>
    </div>
  )
}

function ViewTabs({
  active,
  onChange,
  showHistory,
}: {
  active: PromotionView
  onChange: (view: PromotionView) => void
  showHistory: boolean
}) {
  const views: Array<{
    value: PromotionView
    label: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    { value: "promote", label: "Promote", icon: ArrowUpCircle },
    ...(showHistory
      ? [{ value: "history" as const, label: "History", icon: History }]
      : []),
  ]

  if (views.length === 1) return null

  return (
    <div className="flex overflow-x-auto rounded-xl bg-track p-1">
      {views.map((item) => {
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

function usePromotionView(): [PromotionView, (view: PromotionView) => void] {
  const router = useRouter()
  const params = useSearchParams()
  const raw = params.get("view")
  const active: PromotionView = raw === "history" ? "history" : "promote"

  const setActive = React.useCallback(
    (view: PromotionView) => {
      const next = new URLSearchParams(params.toString())
      if (view === "promote") next.delete("view")
      else next.set("view", view)
      const query = next.toString()
      router.replace(query ? `/promotions?${query}` : "/promotions", {
        scroll: false,
      })
    },
    [params, router]
  )

  return [active, setActive]
}

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone?: "success" | "error" | "brand"
  icon: React.ComponentType<{ className?: string }>
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
          {label}
        </p>
        <Icon className={cn("size-4", toneClass)} aria-hidden />
      </div>
      <p className={cn("mt-1 font-mono text-2xl font-bold tabular-nums", toneClass)}>
        {value}
      </p>
    </div>
  )
}

function StudentLink({ row }: { row: PromotionRow }) {
  const name = row.name_en || "-"
  return (
    <Link
      href={`/students/${row.student_id}`}
      className="rounded-sm outline-none hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      {name}
    </Link>
  )
}

function RowStatus({ row }: { row: PromotionRow }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge
        status={row.is_eligible ? "eligible" : "held"}
        tone={row.is_eligible ? "success" : "warning"}
        label={row.is_eligible ? "Eligible" : "Held"}
      />
      {!row.is_eligible && row.reason ? (
        <span className="text-xs text-copy-muted">
          {REASON_LABEL[row.reason] ?? row.reason}
        </span>
      ) : null}
    </div>
  )
}

/** Whether this row can be individually promoted given the actor's permissions. */
function canPromoteRow(row: PromotionRow, canOverride: boolean): boolean {
  // TC students are excluded from promotion outright (the API has no active
  // enrollment to move — a 404).
  if (row.reason === "tc") return false
  // Eligible students promote freely; held (failed / no result) need override.
  return row.is_eligible || canOverride
}


function PreviewTable({
  rows,
  canOverride,
  selected,
  allEligibleSelected,
  someEligibleSelected,
  hasEligible,
  onToggle,
  onToggleAll,
  onPromote,
}: {
  rows: PromotionRow[]
  canOverride: boolean
  selected: Set<string | number>
  allEligibleSelected: boolean
  someEligibleSelected: boolean
  hasEligible: boolean
  onToggle: (id: string | number, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onPromote: (row: PromotionRow) => void
}) {
  function actionCell(row: PromotionRow) {
    if (!canPromoteRow(row, canOverride)) {
      return <span className="text-copy-muted">—</span>
    }
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPromote(row)}
      >
        <ArrowUpCircle className="size-4" aria-hidden />
        Promote
      </Button>
    )
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <SelectCheckbox
                  checked={allEligibleSelected}
                  indeterminate={someEligibleSelected}
                  onChange={onToggleAll}
                  label="Select all eligible students"
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Roll</TableHead>
              <TableHead className="text-right">Annual GPA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.student_id} data-selected={selected.has(row.student_id)}>
                <TableCell>
                  {row.is_eligible ? (
                    <SelectCheckbox
                      checked={selected.has(row.student_id)}
                      onChange={(checked) => onToggle(row.student_id, checked)}
                      label={`Select ${row.name_en ?? "student"}`}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="font-medium text-copy-primary">
                  <StudentLink row={row} />
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.roll_no ?? "-"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatFigure(row.gpa)}
                </TableCell>
                <TableCell>
                  <RowStatus row={row} />
                </TableCell>
                <TableCell className="text-right">{actionCell(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 p-4 md:hidden">
        {hasEligible ? (
          <label className="flex items-center gap-2 text-sm font-medium text-copy-secondary">
            <SelectCheckbox
              checked={allEligibleSelected}
              indeterminate={someEligibleSelected}
              onChange={onToggleAll}
              label="Select all eligible students"
            />
            Select all eligible
          </label>
        ) : null}
        {rows.map((row) => (
          <div
            key={row.student_id}
            data-selected={selected.has(row.student_id)}
            className="rounded-lg border border-surface-border bg-subtle p-3 data-[selected=true]:border-brand"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                {row.is_eligible ? (
                  <span className="pt-0.5">
                    <SelectCheckbox
                      checked={selected.has(row.student_id)}
                      onChange={(checked) => onToggle(row.student_id, checked)}
                      label={`Select ${row.name_en ?? "student"}`}
                    />
                  </span>
                ) : null}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-copy-primary">
                    <StudentLink row={row} />
                  </p>
                  <p className="font-mono text-sm text-copy-muted">
                    Roll {row.roll_no ?? "-"}
                  </p>
                </div>
              </div>
              <RowStatus row={row} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm">
                <span className="block text-copy-muted">Annual GPA</span>
                <span className="font-mono">{formatFigure(row.gpa)}</span>
              </p>
              {actionCell(row)}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function PromoteView({ canOverride }: { canOverride: boolean }) {
  const { isSuperAdmin } = useBranch()
  const [branchId, setBranchId] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [rowFilter, setRowFilter] = React.useState<RowFilter>("all")
  // Client-side pagination of the preview table (the preview returns the whole
  // cohort at once, so we page it locally — see PREVIEW_PAGE_SIZE).
  const [previewPage, setPreviewPage] = React.useState(1)

  // Target scope for the bulk promotion. Individual promotion uses its own
  // self-contained dialog.
  const [toSessionId, setToSessionId] = React.useState<string | null>(null)
  const [toClassId, setToClassId] = React.useState<string | null>(null)
  const [toSectionId, setToSectionId] = React.useState<string | null>(null)
  const [rollStrategy, setRollStrategy] = React.useState<RollStrategy>("by_merit")

  // Frozen at submit so tweaking source pickers doesn't re-fetch the preview.
  const [submitted, setSubmitted] = React.useState<{
    session_id: string
    class_id: string
    branch_id: string | null
  } | null>(null)
  const [confirmBulk, setConfirmBulk] = React.useState(false)
  const [confirmSelected, setConfirmSelected] = React.useState(false)
  const [individualRow, setIndividualRow] = React.useState<PromotionRow | null>(
    null
  )
  // Selected eligible students for "promote selected", by student id. Persists
  // across pages/filters; cleared on a new preview.
  const [selected, setSelected] = React.useState<Set<string | number>>(
    () => new Set()
  )

  const preview = usePromotionPreview(
    submitted ?? { session_id: null, class_id: null },
    submitted !== null
  )
  const bulk = usePromoteBulk()

  const data: PromotionPreview | undefined = preview.data

  // Default the target class to the API-resolved next class by matching its
  // name against the class options (the preview returns a numeric id, which the
  // hashed ClassSelect can't preselect). The user can still change it. This is
  // the "adjust state during render" pattern — once `toClassId` is set the guard
  // stops it re-entering.
  const classesQuery = useClasses(branchId)
  const nextClassName = data?.to_class?.name ?? null
  if (nextClassName && toClassId == null && classesQuery.data) {
    const match = classesQuery.data.find(
      (schoolClass) => schoolClass.name === nextClassName
    )
    if (match) setToClassId(match.id)
  }

  const rows = React.useMemo<PromotionRow[]>(() => {
    if (!data) return []
    const eligible: PromotionRow[] = data.eligible.map((student) => ({
      student_id: student.student_id,
      name_en: student.name_en,
      roll_no: student.roll_no,
      gpa: student.annual_gpa,
      is_eligible: true,
      reason: null,
    }))
    const held: PromotionRow[] = data.not_eligible.map((student) => ({
      student_id: student.student_id,
      name_en: student.name_en,
      roll_no: null,
      gpa: null,
      is_eligible: false,
      reason: student.reason,
    }))
    if (rowFilter === "eligible") return eligible
    if (rowFilter === "held") return held
    return [...eligible, ...held]
  }, [data, rowFilter])

  const counts = React.useMemo(() => {
    const eligible = data?.eligible.length ?? 0
    const held = data?.not_eligible.length ?? 0
    return { eligible, held, total: eligible + held }
  }, [data])

  // Page the (possibly large) preview locally so the table never renders
  // thousands of rows at once. Clamp the page in case the filtered list shrank.
  const rowLastPage = Math.max(1, Math.ceil(rows.length / PREVIEW_PAGE_SIZE))
  const rowPage = Math.min(previewPage, rowLastPage)
  const pageRows = rows.slice(
    (rowPage - 1) * PREVIEW_PAGE_SIZE,
    rowPage * PREVIEW_PAGE_SIZE
  )
  const rowMeta: PaginationMeta = {
    current_page: rowPage,
    last_page: rowLastPage,
    per_page: PREVIEW_PAGE_SIZE,
    total: rows.length,
    from: rows.length === 0 ? 0 : (rowPage - 1) * PREVIEW_PAGE_SIZE + 1,
    to: Math.min(rowPage * PREVIEW_PAGE_SIZE, rows.length),
  }

  function changeRowFilter(next: RowFilter) {
    setRowFilter(next)
    setPreviewPage(1)
  }

  // Only eligible students can be batch-promoted (the bulk path re-enrolls held
  // students in the same class, which is not a promotion). Selection is tracked
  // by student id across pages.
  const eligibleIds = React.useMemo(
    () => (data?.eligible ?? []).map((student) => student.student_id),
    [data]
  )
  const selectedCount = eligibleIds.filter((id) => selected.has(id)).length
  const allEligibleSelected =
    eligibleIds.length > 0 && selectedCount === eligibleIds.length
  const someEligibleSelected = selectedCount > 0 && !allEligibleSelected

  function toggleOne(id: string | number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }
  function toggleAllEligible(checked: boolean) {
    setSelected(checked ? new Set(eligibleIds) : new Set())
  }

  // Map the selected preview row into the shared promote dialog's student shape.
  const individualStudent: PromoteStudentTarget | null = individualRow
    ? {
        id: individualRow.student_id,
        name: individualRow.name_en,
        currentRoll: individualRow.roll_no,
        isEligible: individualRow.is_eligible,
      }
    : null

  const canSubmit = Boolean(sessionId && classId)
  const nextClass = data?.to_class ?? null
  const topClass = data != null && nextClass == null
  const sameSession = Boolean(toSessionId && toSessionId === submitted?.session_id)
  const targetReady = Boolean(toSessionId && toClassId && toSectionId && !sameSession)

  function changeBranch(value: string | null) {
    setBranchId(value)
    setClassId(null)
    setToClassId(null)
    setToSectionId(null)
  }
  function changeToClass(value: string | null) {
    setToClassId(value)
    setToSectionId(null)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!sessionId || !classId) return
    setRowFilter("all")
    setPreviewPage(1)
    setToClassId(null)
    setToSectionId(null)
    setSelected(new Set())
    setSubmitted({ session_id: sessionId, class_id: classId, branch_id: branchId })
  }

  async function runBulk() {
    if (!submitted || !toSessionId || !toSectionId) return
    try {
      const result = await bulk.mutateAsync({
        from_session_id: submitted.session_id,
        from_class_id: submitted.class_id,
        to_session_id: toSessionId,
        to_section_id: toSectionId,
        roll_strategy: rollStrategy,
      })
      toastSuccess(
        `Promoted ${result.promoted} student${result.promoted === 1 ? "" : "s"}` +
          (nextClass?.name ? ` to ${nextClass.name}.` : ".") +
          (result.held > 0 ? ` ${result.held} held back.` : ""),
        { id: "promotions-bulk" }
      )
    } catch (error) {
      toastError(error, "Bulk promotion failed.", { id: "promotions-bulk" })
      throw error
    }
  }

  async function runSelected() {
    if (!submitted || !toSessionId || !toSectionId) return
    const ids = eligibleIds.filter((id) => selected.has(id))
    if (ids.length === 0) return
    try {
      const result = await bulk.mutateAsync({
        from_session_id: submitted.session_id,
        from_class_id: submitted.class_id,
        to_session_id: toSessionId,
        to_section_id: toSectionId,
        // A partial run keeps source rolls: by_merit would renumber the subset
        // from 1 and collide with students already in the target section.
        roll_strategy: "keep",
        student_ids: ids,
      })
      setSelected(new Set())
      toastSuccess(
        `Promoted ${result.promoted} selected student${result.promoted === 1 ? "" : "s"}` +
          (nextClass?.name ? ` to ${nextClass.name}.` : "."),
        { id: "promotions-selected" }
      )
    } catch (error) {
      toastError(error, "Promotion failed.", { id: "promotions-selected" })
      throw error
    }
  }


  return (
    <section className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm"
      >
        <p className="mb-3 text-sm font-semibold text-copy-primary">Source class</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isSuperAdmin ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                Branch
              </span>
              <BranchSelect
                value={branchId}
                onValueChange={changeBranch}
                clearLabel="All branches"
                placeholder="All branches"
              />
            </label>
          ) : null}
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
              onValueChange={setClassId}
              branchId={branchId}
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={!canSubmit}>
              <Search className="size-4" aria-hidden />
              Preview
            </Button>
          </div>
        </div>
      </form>

      {submitted === null ? (
        <EmptyState
          icon={ArrowUpCircle}
          title="Preview a class for promotion"
          description="Pick a session and class, then preview to see which students are eligible to move up and which are held back."
        />
      ) : preview.isPending ? (
        <PreviewSkeleton />
      ) : preview.isError ? (
        <ErrorPanel
          title="Couldn't load the promotion preview"
          description={preview.error.message}
          onRetry={() => preview.refetch()}
        />
      ) : data && counts.total === 0 ? (
        <EmptyState
          icon={Users}
          title="No students to promote"
          description="This class and session has no active students to preview."
        />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Eligible"
              value={counts.eligible}
              tone="success"
              icon={CheckCircle2}
            />
            <SummaryCard
              label="Held"
              value={counts.held}
              tone="error"
              icon={PauseCircle}
            />
            <SummaryCard label="Total" value={counts.total} icon={Users} />
          </div>

          <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-copy-primary">
                Bulk promotion
              </p>
              <p className="text-sm text-copy-muted">
                {topClass
                  ? "This is the top class — there is no next class to promote to. Move individual students to another class from the table below."
                  : nextClass?.name
                    ? `Eligible students move up to ${nextClass.name}. Pick the target session and section, then promote them together. Use the table's Promote button for one student at a time.`
                    : "Pick the target session, class and section, then promote. Use the table's Promote button for one student at a time."}
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Target session
                </span>
                <SessionSelect
                  value={toSessionId}
                  onValueChange={setToSessionId}
                  placeholder="Select session"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Target class
                </span>
                <ClassSelect
                  value={toClassId}
                  onValueChange={changeToClass}
                  branchId={submitted.branch_id}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Target section
                </span>
                <SectionSelect
                  classId={toClassId}
                  value={toSectionId}
                  onValueChange={setToSectionId}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
                  Roll strategy (bulk)
                </span>
                <AcademicSelect<RollStrategy>
                  value={rollStrategy}
                  onValueChange={(value) => setRollStrategy(value ?? "by_merit")}
                  options={ROLL_STRATEGIES}
                />
              </label>
            </div>
            {sameSession ? (
              <p className="mt-3 text-sm text-error">
                The target session must be different from the source session.
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2 border-t border-surface-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-copy-muted">
                {counts.eligible} eligible student
                {counts.eligible === 1 ? "" : "s"} will be promoted. Held students
                repeat their class.
              </p>
              <Button
                type="button"
                disabled={!targetReady || counts.eligible === 0}
                onClick={() => setConfirmBulk(true)}
              >
                <ArrowUpCircle className="size-4" aria-hidden />
                Promote {counts.eligible} eligible
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex overflow-x-auto rounded-lg bg-track p-1">
              {(
                [
                  { value: "all", label: `All (${counts.total})` },
                  { value: "eligible", label: `Eligible (${counts.eligible})` },
                  { value: "held", label: `Held (${counts.held})` },
                ] as Array<{ value: RowFilter; label: string }>
              ).map((option) => {
                const isActive = rowFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeRowFilter(option.value)}
                    className={cn(
                      "min-h-8 shrink-0 rounded-md px-3 text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-surface text-brand shadow-sm"
                        : "text-copy-secondary hover:bg-hover hover:text-copy-primary"
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {selectedCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-copy-secondary">
                  {selectedCount} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!targetReady}
                  onClick={() => setConfirmSelected(true)}
                  title={
                    targetReady
                      ? undefined
                      : "Set the target session, class and section above first"
                  }
                >
                  <ArrowUpCircle className="size-4" aria-hidden />
                  Promote selected
                </Button>
              </div>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No students in this view"
              description="No students match the selected filter."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
              <PreviewTable
                rows={pageRows}
                canOverride={canOverride}
                selected={selected}
                allEligibleSelected={allEligibleSelected}
                someEligibleSelected={someEligibleSelected}
                hasEligible={eligibleIds.length > 0}
                onToggle={toggleOne}
                onToggleAll={toggleAllEligible}
                onPromote={setIndividualRow}
              />
              <div className="border-t border-surface-border px-4 py-3">
                <ListPager
                  meta={rowMeta}
                  page={rowPage}
                  lastPage={rowLastPage}
                  unit="student"
                  onPage={setPreviewPage}
                />
              </div>
            </div>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={(open) => !open && setConfirmBulk(false)}
        title="Promote eligible students?"
        description={
          data
            ? `This promotes ${counts.eligible} eligible student${
                counts.eligible === 1 ? "" : "s"
              }${nextClass?.name ? ` to ${nextClass.name}` : ""}. ${
                counts.held
              } held student${counts.held === 1 ? "" : "s"} will repeat.`
            : "This promotes every eligible student to the next class."
        }
        confirmLabel="Promote eligible"
        pendingLabel="Promoting..."
        onConfirm={runBulk}
      />

      <ConfirmDialog
        open={confirmSelected}
        onOpenChange={(open) => !open && setConfirmSelected(false)}
        title="Promote selected students?"
        description={`This promotes the ${selectedCount} selected student${
          selectedCount === 1 ? "" : "s"
        }${nextClass?.name ? ` to ${nextClass.name}` : ""} using the target above.`}
        confirmLabel="Promote selected"
        pendingLabel="Promoting..."
        onConfirm={runSelected}
      />

      <PromoteStudentDialog
        student={individualStudent}
        branchId={submitted?.branch_id ?? null}
        defaultClassName={nextClass?.name ?? null}
        onClose={() => setIndividualRow(null)}
      />
    </section>
  )
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] rounded-xl border border-surface-border bg-surface shadow-sm"
          />
        ))}
      </div>
      <div className="h-40 rounded-xl border border-surface-border bg-surface shadow-sm" />
      <div className="h-64 rounded-xl border border-surface-border bg-surface shadow-sm" />
    </div>
  )
}

const HISTORY_TYPES: Array<{ value: PromotionType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "bulk", label: "Bulk" },
  { value: "individual", label: "Individual" },
]

function HistoryView() {
  const [typeFilter, setTypeFilter] = React.useState<PromotionType | "all">("all")
  const [page, setPage] = React.useState(1)
  const history = usePromotionHistory({ type: typeFilter, page })
  const runs = history.data?.data ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
        <label className="grid max-w-xs gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-copy-muted uppercase">
            Type
          </span>
          <AcademicSelect<PromotionType | "all">
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value ?? "all")
              setPage(1)
            }}
            options={HISTORY_TYPES}
          />
        </label>
      </div>

      {history.isPending ? (
        <div
          className="h-64 rounded-xl border border-surface-border bg-surface shadow-sm"
          aria-busy
        />
      ) : history.isError ? (
        <ErrorPanel
          title="Couldn't load promotion history"
          description={history.error.message}
          onRetry={() => history.refetch()}
        />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No promotion runs yet"
          description="Past bulk and individual promotions will appear here once you run them."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-copy-secondary">
                      {run.promoted_at
                        ? new Date(run.promoted_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-copy-primary">
                      <Link
                        href={`/students/${run.student.id}`}
                        className="rounded-sm outline-none hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {run.student.name_en || "-"}
                      </Link>
                    </TableCell>
                    <TableCell>{run.from.class || "-"}</TableCell>
                    <TableCell>{run.to.class || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={run.type}
                        tone={run.type === "bulk" ? "info" : "neutral"}
                        label={run.type === "bulk" ? "Bulk" : "Individual"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {runs.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border border-surface-border bg-subtle p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/students/${run.student.id}`}
                    className="font-semibold text-copy-primary hover:text-brand hover:underline"
                  >
                    {run.student.name_en || "-"}
                  </Link>
                  <span className="text-sm text-copy-muted">
                    {run.promoted_at
                      ? new Date(run.promoted_at).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-copy-muted">
                  {(run.from.class || "-") + " → " + (run.to.class || "-")}
                </p>
                <div className="mt-2">
                  <StatusBadge
                    status={run.type}
                    tone={run.type === "bulk" ? "info" : "neutral"}
                    label={run.type === "bulk" ? "Bulk" : "Individual"}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-border px-4 py-3">
            <ListPager
              meta={history.data?.meta}
              page={page}
              lastPage={history.data?.meta?.last_page ?? 1}
              unit="run"
              disabled={history.isFetching}
              onPage={setPage}
            />
          </div>
        </div>
      )}
    </section>
  )
}

export function PromotionsPage() {
  const { hasPermission } = useAuth()
  const canOverride = hasPermission(PROMOTION_OVERRIDE)
  const canViewHistory = hasPermission(PROMOTION_VIEW)
  const [active, setActive] = usePromotionView()
  const effective: PromotionView =
    active === "history" && !canViewHistory ? "promote" : active

  return (
    <div className="flex flex-col gap-5">
      <PageHeader />
      <ViewTabs active={effective} onChange={setActive} showHistory={canViewHistory} />
      {effective === "history" ? (
        <HistoryView />
      ) : (
        <PromoteView canOverride={canOverride} />
      )}
    </div>
  )
}
