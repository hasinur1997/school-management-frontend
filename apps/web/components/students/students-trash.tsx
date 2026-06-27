"use client"

/**
 * Students trash: soft-deleted student rows from `GET /students/trash`, with
 * restore and permanent-delete actions. The API is authoritative for whether a
 * student can be force-deleted; dependent-history conflicts surface as errors.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  GraduationCap,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { SelectCheckbox } from "@/components/select-checkbox"
import {
  ClassSelect,
  SectionSelect,
  SessionSelect,
} from "@/components/academic"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useBulkForceDeleteStudents,
  useBulkRestoreStudents,
  useForceDeleteStudent,
  useRestoreStudent,
  useTrashedStudents,
} from "@/hooks/students"
import {
  studentDisplayName,
  studentInitials,
  studentStatusLabel,
  type StudentListItem,
  type StudentStatusFilter,
} from "@/types/student"
import { StudentStatusFilter as StatusFilterSelect } from "./student-status-filter"

const EMPTY = "—"

export function StudentsTrash() {
  const [searchInput, setSearchInput] = React.useState("")
  const [status, setStatus] = React.useState<StudentStatusFilter>("all")
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const search = useDebouncedValue(searchInput, 300)

  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeStatus(value: StudentStatusFilter) {
    setStatus(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setSectionId(null)
    setPage(1)
  }
  function changeSection(value: string | null) {
    setSectionId(value)
    setPage(1)
  }
  function changeSession(value: string | null) {
    setSessionId(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useTrashedStudents({
    search,
    status,
    class_id: classId,
    section_id: sectionId,
    session_id: sessionId,
    page,
  })

  const restore = useRestoreStudent()
  const bulkRestore = useBulkRestoreStudents()
  const forceDelete = useForceDeleteStudent()
  const bulkForceDelete = useBulkForceDeleteStudents()

  const [forceTarget, setForceTarget] = React.useState<StudentListItem | null>(
    null
  )
  const [bulkForceOpen, setBulkForceOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const students = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    search.trim().length > 0 ||
    status !== "all" ||
    classId != null ||
    sectionId != null ||
    sessionId != null

  const selectedStudents = students.filter((student) =>
    selected.has(student.id)
  )
  const selectedCount = selectedStudents.length
  const allOnPageSelected =
    students.length > 0 && selectedCount === students.length

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(
      checked ? new Set(students.map((student) => student.id)) : new Set()
    )
  }

  function clearFilters() {
    setSearchInput("")
    setStatus("all")
    setClassId(null)
    setSectionId(null)
    setSessionId(null)
    setPage(1)
  }

  async function restoreOne(student: StudentListItem) {
    try {
      await restore.mutateAsync(student.id)
      toastSuccess("Student restored.", { id: "student-restore" })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(student.id)
        return next
      })
    } catch (error) {
      toastError(error, "Couldn't restore the student.", {
        id: "student-restore",
      })
    }
  }

  async function restoreSelected() {
    const ids = selectedStudents.map((student) => student.id)
    if (ids.length === 0) return
    try {
      await bulkRestore.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Student restored."
          : `${ids.length} students restored.`,
        { id: "student-bulk-restore" }
      )
      setSelected(new Set())
    } catch (error) {
      toastError(error, "Couldn't restore the students.", {
        id: "student-bulk-restore",
      })
    }
  }

  async function confirmForceDelete() {
    if (!forceTarget) return
    try {
      await forceDelete.mutateAsync(forceTarget.id)
      toastSuccess("Student permanently deleted.", {
        id: "student-force-delete",
      })
      setForceTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the student.", {
        id: "student-force-delete",
      })
      throw error
    }
  }

  async function confirmBulkForceDelete() {
    const ids = selectedStudents.map((student) => student.id)
    if (ids.length === 0) return
    try {
      await bulkForceDelete.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Student permanently deleted."
          : `${ids.length} students permanently deleted.`,
        { id: "student-bulk-force-delete" }
      )
      setSelected(new Set())
      setBulkForceOpen(false)
    } catch (error) {
      toastError(error, "Couldn't delete the students.", {
        id: "student-bulk-force-delete",
      })
      throw error
    }
  }

  const rowActions = (student: StudentListItem) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        loading={restore.isPending}
        onClick={() => void restoreOne(student)}
        title="Restore student"
      >
        <RotateCcw className="size-4" aria-hidden />
        <span className="sr-only">Restore {studentDisplayName(student)}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setForceTarget(student)}
        title="Delete permanently"
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="sr-only">
          Permanently delete {studentDisplayName(student)}
        </span>
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/students" />}
          className="-ml-2 w-fit text-copy-muted"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to students
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Student trash
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Restore deleted students or delete empty profiles permanently.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, admission no, or mobile…"
            aria-label="Search trashed students"
            className="h-9 pl-8"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ClassSelect
            value={classId}
            onValueChange={changeClass}
            aria-label="Filter by class"
          />
          <SectionSelect
            classId={classId}
            value={sectionId}
            onValueChange={changeSection}
            aria-label="Filter by section"
          />
          <SessionSelect
            value={sessionId}
            onValueChange={changeSession}
            aria-label="Filter by session"
          />
          <StatusFilterSelect value={status} onValueChange={changeStatus} />
        </div>
        {hasFilters ? (
          <div>
            <Button variant="ghost" onClick={clearFilters}>
              <X className="size-4" aria-hidden />
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-subtle px-4 py-2.5">
          <p className="text-sm font-medium text-copy-secondary">
            {selectedCount} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={bulkRestore.isPending}
              onClick={() => void restoreSelected()}
            >
              <RotateCcw className="size-4" aria-hidden />
              Restore
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkForceOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete permanently
            </Button>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <TableSkeleton rows={8} columns={7} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the student trash."
          onRetry={() => void refetch()}
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={hasFilters ? "No matching students" : "Trash is empty"}
          description={
            hasFilters
              ? "No deleted students match the current filters."
              : "Deleted students will appear here."
          }
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
                  <TableHead className="w-px">
                    <SelectCheckbox
                      checked={allOnPageSelected}
                      indeterminate={selectedCount > 0}
                      onChange={toggleAll}
                      label="Select all students on this page"
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission no</TableHead>
                  <TableHead>Class / Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow
                    key={student.id}
                    data-selected={selected.has(student.id)}
                  >
                    <TableCell className="w-px">
                      <SelectCheckbox
                        checked={selected.has(student.id)}
                        onChange={(checked) => toggleOne(student.id, checked)}
                        label={`Select ${studentDisplayName(student)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <StudentIdentity student={student} />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {student.admission_no || EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {[student.class, student.section]
                        .filter(Boolean)
                        .join(" · ") || EMPTY}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={student.status}
                        label={studentStatusLabel(student.status)}
                      />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {deletedOn(student)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rowActions(student)}
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
                unit="student"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {students.map((student) => (
              <li
                key={student.id}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4"
                data-selected={selected.has(student.id)}
              >
                <div className="flex items-start gap-2.5">
                  <span className="pt-1">
                    <SelectCheckbox
                      checked={selected.has(student.id)}
                      onChange={(checked) => toggleOne(student.id, checked)}
                      label={`Select ${studentDisplayName(student)}`}
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <StudentIdentity student={student} />
                      <StatusBadge
                        status={student.status}
                        label={studentStatusLabel(student.status)}
                      />
                    </div>
                    <p className="truncate text-xs text-copy-muted">
                      {student.admission_no ? `${student.admission_no} · ` : ""}
                      {[student.class, student.section]
                        .filter(Boolean)
                        .join(" · ") || EMPTY}
                      {student.roll_no != null && student.roll_no !== ""
                        ? ` · Roll ${student.roll_no}`
                        : ""}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      Deleted {deletedOn(student)}
                    </p>
                  </div>
                </div>
                {rowActions(student)}
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="student"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <DeleteDialog
        open={forceTarget != null}
        onOpenChange={(open) => !open && setForceTarget(null)}
        title="Delete student permanently"
        description={
          forceTarget ? (
            <>
              Permanently delete{" "}
              <span className="font-medium">
                {studentDisplayName(forceTarget)}
              </span>
              ? This only works when the API confirms there is no dependent
              academic or financial history. This can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        onConfirm={confirmForceDelete}
      />
      <DeleteDialog
        open={bulkForceOpen}
        onOpenChange={setBulkForceOpen}
        title={`Delete ${selectedCount} student${selectedCount === 1 ? "" : "s"} permanently`}
        description={
          <>
            Permanently delete the {selectedCount} selected student
            {selectedCount === 1 ? "" : "s"}? The API blocks rows with dependent
            history. This can&apos;t be undone.
          </>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={confirmBulkForceDelete}
      />
    </div>
  )
}

function deletedOn(student: StudentListItem): string {
  return student.deleted_at ? formatDate(student.deleted_at) : EMPTY
}

function StudentIdentity({ student }: { student: StudentListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {student.photo_url ? (
          <AvatarImage src={student.photo_url} alt="" />
        ) : null}
        <AvatarFallback>{studentInitials(student)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-copy-primary">
          {student.name_en || student.name_bn || EMPTY}
        </p>
        {student.name_en && student.name_bn ? (
          <p className="truncate text-xs text-copy-muted">{student.name_bn}</p>
        ) : null}
      </div>
    </div>
  )
}
