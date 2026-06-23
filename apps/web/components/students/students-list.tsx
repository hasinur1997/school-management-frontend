"use client"

/**
 * Students list (task 2.7): paginated, searchable table with class / section /
 * session / status filters and a mobile card list, plus the edit, photo, and
 * status-toggle actions. Reads `useStudents`; writes invalidate the cache.
 * Implements all four states — loading / empty / error / loaded — and is
 * responsive (table ≥ md, cards below).
 *
 * The list resource carries no branch field, so there's no branch column; branch
 * is auto-scoped by the API (the shell branch switcher folds it into the query
 * key). TC students are flagged via their status badge and are never special-
 * cased out client-side — the API status is authoritative.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Search, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { ClassSelect, SectionSelect, SessionSelect } from "@/components/academic"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { toastError, toastSuccess } from "@/lib/toast"
import { useStudents, useUpdateStudentStatus } from "@/hooks/students"
import { ConfirmDialog } from "@/components/teachers/confirm-dialog"
import {
  isTcStudent,
  studentDisplayName,
  studentInitials,
  studentStatusLabel,
  type StudentListItem,
  type StudentStatusFilter,
} from "@/types/student"
import { useStudent } from "@/hooks/students/use-student"
import { StudentStatusFilter as StatusFilterSelect } from "./student-status-filter"
import { StudentRowActions } from "./student-row-actions"
import { StudentFormDialog } from "./student-form-dialog"
import { StudentPhotoDialog } from "./student-photo-dialog"

const EMPTY = "—"

export function StudentsList() {
  const router = useRouter()

  const [searchInput, setSearchInput] = React.useState("")
  const [status, setStatus] = React.useState<StudentStatusFilter>("all")
  const [classId, setClassId] = React.useState<number | null>(null)
  const [sectionId, setSectionId] = React.useState<number | null>(null)
  const [sessionId, setSessionId] = React.useState<number | null>(null)
  const [page, setPage] = React.useState(1)

  const search = useDebouncedValue(searchInput, 300)

  // Changing a filter resets to the first page (handled in the change handlers
  // rather than an effect — there's no external system to sync).
  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeStatus(value: StudentStatusFilter) {
    setStatus(value)
    setPage(1)
  }
  function changeClass(value: number | null) {
    setClassId(value)
    setSectionId(null) // section depends on class
    setPage(1)
  }
  function changeSection(value: number | null) {
    setSectionId(value)
    setPage(1)
  }
  function changeSession(value: number | null) {
    setSessionId(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useStudents({
    search,
    status,
    class_id: classId,
    section_id: sectionId,
    session_id: sessionId,
    page,
  })

  const updateStatus = useUpdateStudentStatus()

  // Dialog targets. Edit/photo need the full profile; the list rows are compact,
  // so we open by id and fetch the profile inside the dialogs' loader below.
  const [editId, setEditId] = React.useState<string | null>(null)
  const [photoId, setPhotoId] = React.useState<string | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<StudentListItem | null>(null)

  const students = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    search.trim().length > 0 ||
    status !== "all" ||
    classId != null ||
    sectionId != null ||
    sessionId != null

  function clearFilters() {
    setSearchInput("")
    setStatus("all")
    setClassId(null)
    setSectionId(null)
    setSessionId(null)
    setPage(1)
  }

  async function confirmToggleStatus() {
    if (!statusTarget) return
    const next = statusTarget.status === "active" ? "inactive" : "active"
    try {
      await updateStatus.mutateAsync({ id: statusTarget.id, status: next })
      toastSuccess(next === "active" ? "Student activated." : "Student deactivated.", {
        id: "student-status",
      })
      setStatusTarget(null)
    } catch (error) {
      toastError(error, "Couldn't update the status.", { id: "student-status" })
      throw error
    }
  }

  const rowActions = (student: StudentListItem) => (
    <StudentRowActions
      label={studentDisplayName(student)}
      isActive={student.status === "active"}
      isTc={isTcStudent(student.status)}
      onView={() => router.push(`/students/${student.id}`)}
      onEdit={() => setEditId(student.id)}
      onChangePhoto={() => setPhotoId(student.id)}
      onToggleStatus={() => setStatusTarget(student)}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">Students</h1>
        <p className="truncate text-sm text-copy-muted">
          View and manage student profiles, enrollment, and status.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, admission no, or mobile…"
            aria-label="Search students"
            className="h-9 pl-8"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ClassSelect value={classId} onValueChange={changeClass} aria-label="Filter by class" />
          <SectionSelect
            classId={classId}
            value={sectionId}
            onValueChange={changeSection}
            aria-label="Filter by section"
          />
          <SessionSelect value={sessionId} onValueChange={changeSession} aria-label="Filter by session" />
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

      {isPending ? (
        <TableSkeleton rows={8} columns={5} />
      ) : isError ? (
        <ErrorPanel description="We couldn't load the students." onRetry={() => void refetch()} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={hasFilters ? "No matching students" : "No students yet"}
          description={
            hasFilters
              ? "No students match the current search or filters."
              : "Students appear here once admissions are approved."
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
                  <TableHead>Student</TableHead>
                  <TableHead>Admission no</TableHead>
                  <TableHead>Class / Section</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/students/${student.id}`)}
                  >
                    <TableCell>
                      <StudentIdentity student={student} />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {student.admission_no || EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {[student.class, student.section].filter(Boolean).join(" · ") || EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {student.roll_no != null && student.roll_no !== "" ? student.roll_no : EMPTY}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={student.status}
                        label={studentStatusLabel(student.status)}
                      />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {students.map((student) => (
              <li
                key={student.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col gap-2 text-left"
                  onClick={() => router.push(`/students/${student.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StudentIdentity student={student} />
                    <StatusBadge
                      status={student.status}
                      label={studentStatusLabel(student.status)}
                    />
                  </div>
                  <p className="truncate text-xs text-copy-muted">
                    {student.admission_no ? `${student.admission_no} · ` : ""}
                    {[student.class, student.section].filter(Boolean).join(" · ") || EMPTY}
                    {student.roll_no != null && student.roll_no !== ""
                      ? ` · Roll ${student.roll_no}`
                      : ""}
                  </p>
                </button>
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

      <StudentEditLoader id={editId} onOpenChange={(open) => !open && setEditId(null)} />
      <StudentPhotoLoader id={photoId} onOpenChange={(open) => !open && setPhotoId(null)} />
      <ConfirmDialog
        open={statusTarget != null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget && statusTarget.status === "active"
            ? "Deactivate student"
            : "Activate student"
        }
        description={
          statusTarget ? (
            <>
              {statusTarget.status === "active" ? "Deactivate " : "Activate "}
              <span className="font-medium">{studentDisplayName(statusTarget)}</span>?
            </>
          ) : null
        }
        confirmLabel={statusTarget && statusTarget.status === "active" ? "Deactivate" : "Activate"}
        pendingLabel="Updating…"
        onConfirm={confirmToggleStatus}
      />
    </div>
  )
}

/**
 * Edit / photo dialogs need the full profile (the list rows are compact). These
 * thin loaders fetch the selected student by id and only mount the dialog once
 * the profile resolves, so the dialogs work straight from a list row.
 */
function StudentEditLoader({
  id,
  onOpenChange,
}: {
  id: string | null
  onOpenChange: (open: boolean) => void
}) {
  const { data } = useStudent(id)
  return (
    <StudentFormDialog
      open={id != null && data != null}
      onOpenChange={onOpenChange}
      student={data ?? null}
    />
  )
}

function StudentPhotoLoader({
  id,
  onOpenChange,
}: {
  id: string | null
  onOpenChange: (open: boolean) => void
}) {
  const { data } = useStudent(id)
  return (
    <StudentPhotoDialog
      open={id != null && data != null}
      onOpenChange={onOpenChange}
      student={data ?? null}
    />
  )
}

function StudentIdentity({ student }: { student: StudentListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
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

