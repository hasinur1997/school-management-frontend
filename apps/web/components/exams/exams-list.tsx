"use client"

/**
 * Exams list (task 4.1): paginated, filterable table with a mobile card list and
 * a create/edit dialog. Reads `useExams`; writes invalidate the cache. Filters
 * by session, class, type, and status via the shared academic selectors. All
 * four states — loading / empty / error / loaded — are present and the layout is
 * responsive (table ≥ md, cards below).
 *
 * The exam resource exposes `session_id`/`class_id` as opaque `public_id`
 * hashes, not names, so the screen resolves labels from the cached session/class
 * selector data (`useSessions`/`useClasses`).
 */

import * as React from "react"
import { ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { SessionSelect } from "@/components/academic/session-select"
import { ClassSelect } from "@/components/academic/class-select"
import { useSessions } from "@/hooks/academic"
import { useExams, useDeleteExam, useBulkDeleteExam } from "@/hooks/exams"
import { usePermission } from "@/hooks/auth/use-permission"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatDateRange } from "@/lib/format/date"
import {
  EXAM_STATUS_LABELS,
  EXAM_STATUS_TONE,
  EXAM_TYPE_LABELS,
  EXAM_TYPES,
  type Exam,
  type ExamStatusFilter,
  type ExamType,
  type ExamTypeFilter,
} from "@/types/exam"
import { EXAM_MANAGE } from "./permissions"
import { ExamFormDialog } from "./exam-form-dialog"

/** Small accessible checkbox for row/bulk selection (no UI primitive exists). */
function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="size-4 cursor-pointer accent-primary"
    />
  )
}

const EMPTY = "—"

/** A short label for the classes an exam covers ("All classes" or a name list). */
function classesLabel(exam: Exam): string {
  if (exam.all_classes) return "All classes"
  const names = (exam.classes ?? []).map((c) => c.name).filter(Boolean)
  return names.length > 0 ? names.join(", ") : EMPTY
}

const STATUS_FILTERS: { value: ExamStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "published", label: "Published" },
]

export function ExamsList() {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [type, setType] = React.useState<ExamTypeFilter>("all")
  const [status, setStatus] = React.useState<ExamStatusFilter>("all")
  const [page, setPage] = React.useState(1)

  // Changing a filter resets to the first page.
  function changeSession(value: string | null) {
    setSessionId(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setPage(1)
  }
  function changeType(value: ExamTypeFilter) {
    setType(value)
    setPage(1)
  }
  function changeStatus(value: ExamStatusFilter) {
    setStatus(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useExams({
    session_id: sessionId,
    class_id: classId,
    type,
    status,
    page,
  })

  // The exam resource exposes `session_id` as a hash (no name), so resolve it
  // from the cached session selector data; class names come on each exam row.
  const { data: sessions } = useSessions()
  const sessionName = React.useMemo(() => {
    const map = new Map((sessions ?? []).map((s) => [s.id, s.name]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? null : null)
  }, [sessions])

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Exam | undefined>()

  // Delete state: a single target, or the bulk selection.
  const [deleteTarget, setDeleteTarget] = React.useState<Exam | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const canManage = usePermission(EXAM_MANAGE)
  const deleteExam = useDeleteExam()
  const bulkDeleteExam = useBulkDeleteExam()

  const exams = React.useMemo(() => data?.data ?? [], [data])
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    sessionId != null || classId != null || type !== "all" || status !== "all"

  // Selection is page-scoped: only ids present on the current page count, so a
  // page change or refetch naturally drops stale ids without an effect.
  const selectedExams = exams.filter((e) => selected.has(e.id))
  const selectedCount = selectedExams.length
  const allOnPageSelected = exams.length > 0 && selectedCount === exams.length

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(exams.map((e) => e.id)) : new Set())
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteExam.mutateAsync(deleteTarget.id)
      toastSuccess("Exam deleted.", { id: "exam-delete" })
      setDeleteTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the exam.", { id: "exam-delete" })
      throw error
    }
  }

  async function confirmBulkDelete() {
    const ids = selectedExams.map((e) => e.id)
    if (ids.length === 0) return
    try {
      await bulkDeleteExam.mutateAsync(ids)
      toastSuccess(
        ids.length === 1 ? "Exam deleted." : `${ids.length} exams deleted.`,
        { id: "exam-bulk-delete" },
      )
      setSelected(new Set())
      setBulkOpen(false)
    } catch (error) {
      toastError(error, "Couldn't delete the exams.", { id: "exam-bulk-delete" })
      throw error
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(exam: Exam) {
    setEditing(exam)
    setFormOpen(true)
  }
  function clearFilters() {
    setSessionId(null)
    setClassId(null)
    setType("all")
    setStatus("all")
    setPage(1)
  }

  const createButton = (
    <Can permission={EXAM_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New exam
      </Button>
    </Can>
  )

  const rowActions = (exam: Exam) => (
    <Can permission={EXAM_MANAGE}>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(exam)}
          title="Edit exam"
        >
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only">Edit {exam.name}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(exam)}
          title="Delete exam"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="sr-only">Delete {exam.name}</span>
        </Button>
      </div>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Exams
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Manage exams per session and class.
          </p>
        </div>
        {createButton}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="sm:w-48">
          <SessionSelect
            value={sessionId}
            onValueChange={changeSession}
            aria-label="Filter by session"
          />
        </div>
        <div className="sm:w-48">
          <ClassSelect
            value={classId}
            onValueChange={changeClass}
            aria-label="Filter by class"
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={type}
            onValueChange={(next) => changeType((next as ExamTypeFilter) ?? "all")}
          >
            <SelectTrigger aria-label="Filter by type" className="w-full">
              <SelectValue>
                {(v: ExamTypeFilter) =>
                  v === "all" ? "All types" : EXAM_TYPE_LABELS[v as ExamType]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {EXAM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {EXAM_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-48">
          <Select
            value={status}
            onValueChange={(next) =>
              changeStatus((next as ExamStatusFilter) ?? "all")
            }
          >
            <SelectTrigger aria-label="Filter by status" className="w-full">
              <SelectValue>
                {(v: ExamStatusFilter) =>
                  STATUS_FILTERS.find((o) => o.value === v)?.label ??
                  "All statuses"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {canManage && selectedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-subtle px-4 py-2.5">
          <p className="text-sm font-medium text-copy-secondary">
            {selectedCount} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <TableSkeleton rows={8} columns={canManage ? 8 : 7} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the exams."
          onRetry={() => void refetch()}
        />
      ) : exams.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? "No matching exams" : "No exams yet"}
          description={
            hasFilters
              ? "No exams match the current filters."
              : "Create an exam for a class to get started."
          }
          action={hasFilters ? undefined : createButton}
        />
      ) : (
        <>
          <div
            className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm md:block"
            aria-busy={isFetching}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage ? (
                    <TableHead className="w-px">
                      <SelectCheckbox
                        checked={allOnPageSelected}
                        indeterminate={selectedCount > 0}
                        onChange={toggleAll}
                        label="Select all exams on this page"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Exam</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id} data-selected={selected.has(exam.id)}>
                    {canManage ? (
                      <TableCell className="w-px">
                        <SelectCheckbox
                          checked={selected.has(exam.id)}
                          onChange={(c) => toggleOne(exam.id, c)}
                          label={`Select ${exam.name}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="font-medium text-copy-primary">
                      {exam.name}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {EXAM_TYPE_LABELS[exam.type] ?? exam.type}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {sessionName(exam.session_id) ?? EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {classesLabel(exam)}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {formatDateRange(exam.start_date, exam.end_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={EXAM_STATUS_LABELS[exam.status] ?? exam.status}
                        tone={EXAM_STATUS_TONE[exam.status]}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {rowActions(exam)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="exam"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {canManage ? (
                      <span className="pt-0.5">
                        <SelectCheckbox
                          checked={selected.has(exam.id)}
                          onChange={(c) => toggleOne(exam.id, c)}
                          label={`Select ${exam.name}`}
                        />
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-copy-primary">
                        {exam.name}
                      </p>
                      <p className="truncate text-xs text-copy-muted">
                        {EXAM_TYPE_LABELS[exam.type] ?? exam.type}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={EXAM_STATUS_LABELS[exam.status] ?? exam.status}
                    tone={EXAM_STATUS_TONE[exam.status]}
                  />
                </div>
                <p className="text-sm text-copy-secondary">
                  {[sessionName(exam.session_id), classesLabel(exam)]
                    .filter((v) => v && v !== EMPTY)
                    .join(" · ") || EMPTY}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-copy-muted">
                    {formatDateRange(exam.start_date, exam.end_date)}
                  </p>
                  {rowActions(exam)}
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="exam"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <ExamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        exam={editing}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete exam"
        description={
          deleteTarget ? (
            <>
              Delete <span className="font-medium">{deleteTarget.name}</span>?
              This also removes any marks and results entered for it. This can&apos;t
              be undone.
            </>
          ) : null
        }
        onConfirm={confirmDelete}
      />

      <DeleteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={`Delete ${selectedCount} exam${selectedCount === 1 ? "" : "s"}`}
        description={
          <>
            Delete the {selectedCount} selected exam
            {selectedCount === 1 ? "" : "s"}? This also removes any marks and
            results entered for them. This can&apos;t be undone.
          </>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}
