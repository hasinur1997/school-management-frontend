"use client"

/**
 * Teachers list (task 2.4): paginated, searchable, status-filterable table with
 * a mobile card list, plus the create/edit, photo, status-toggle, and
 * resend-credentials actions. Reads `useTeachers`; writes invalidate the cache.
 * Implements all four states — loading / empty / error / loaded — and is
 * responsive (table ≥ md, cards below). Super admins also see a branch column
 * (the shell branch switcher scopes the data).
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Trash2, Users, X } from "lucide-react"

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
import { Can } from "@/components/auth/can"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { SelectCheckbox } from "@/components/select-checkbox"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { useBranch } from "@/components/branch/branch-provider"
import { usePermission } from "@/hooks/auth/use-permission"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useTeachers,
  useToggleTeacherStatus,
  useResendTeacherCredentials,
  useDeleteTeacher,
  useBulkDeleteTeachers,
} from "@/hooks/teachers"
import {
  isTeacherActive,
  teacherDisplayName,
  teacherInitials,
  type Teacher,
  type TeacherStatusFilter,
} from "@/types/teacher"
import { TEACHER_DELETE, TEACHER_MANAGE } from "./permissions"
import { TeacherStatusFilter as StatusFilterSelect } from "./teacher-status-filter"
import { TeacherRowActions } from "./teacher-row-actions"
import { TeacherFormDialog } from "./teacher-form-dialog"
import { TeacherPhotoDialog } from "./teacher-photo-dialog"
import { ConfirmDialog } from "./confirm-dialog"
import { teacherClassNames, teacherSubjectNames } from "./teacher-summary"

const EMPTY = "—"

export function TeachersList() {
  const router = useRouter()
  const { isSuperAdmin } = useBranch()
  const canDelete = usePermission(TEACHER_DELETE)

  const [searchInput, setSearchInput] = React.useState("")
  const [status, setStatus] = React.useState<TeacherStatusFilter>("all")
  const [page, setPage] = React.useState(1)

  const search = useDebouncedValue(searchInput, 300)

  // Changing a filter resets to the first page (handled in the change handlers
  // below rather than an effect — there's no external system to sync).
  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeStatus(value: TeacherStatusFilter) {
    setStatus(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useTeachers({
    search,
    status,
    page,
  })

  const toggleStatus = useToggleTeacherStatus()
  const resendCredentials = useResendTeacherCredentials()
  const deleteTeacher = useDeleteTeacher()
  const bulkDelete = useBulkDeleteTeachers()

  // Dialog state.
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Teacher | undefined>()
  const [photoTarget, setPhotoTarget] = React.useState<Teacher | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<Teacher | null>(null)
  const [resendTarget, setResendTarget] = React.useState<Teacher | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Teacher | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const teachers = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters = search.trim().length > 0 || status !== "all"
  const selectable = canDelete
  const selectedTeachers = teachers.filter((teacher) => selected.has(teacher.id))
  const selectedCount = selectedTeachers.length
  const allOnPageSelected =
    teachers.length > 0 && selectedCount === teachers.length
  // Identity column + status + actions, plus the optional branch and checkbox.
  const columnCount =
    (isSuperAdmin ? 6 : 5) + (selectable ? 1 : 0)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(teacher: Teacher) {
    setEditing(teacher)
    setFormOpen(true)
  }
  function clearFilters() {
    setSearchInput("")
    setStatus("all")
    setPage(1)
  }

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
      checked ? new Set(teachers.map((teacher) => teacher.id)) : new Set()
    )
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteTeacher.mutateAsync(deleteTarget.id)
      toastSuccess("Teacher moved to trash.", { id: "teacher-delete" })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
    } catch (error) {
      toastError(error, "Couldn't move the teacher to trash.", {
        id: "teacher-delete",
      })
      throw error
    }
  }

  async function confirmBulkDelete() {
    const ids = selectedTeachers.map((teacher) => teacher.id)
    if (ids.length === 0) return
    try {
      await bulkDelete.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Teacher moved to trash."
          : `${ids.length} teachers moved to trash.`,
        { id: "teacher-bulk-delete" }
      )
      setSelected(new Set())
      setBulkDeleteOpen(false)
    } catch (error) {
      toastError(error, "Couldn't move the teachers to trash.", {
        id: "teacher-bulk-delete",
      })
      throw error
    }
  }

  async function confirmToggleStatus() {
    if (!statusTarget) return
    const next = !isTeacherActive(statusTarget)
    try {
      await toggleStatus.mutateAsync({ id: statusTarget.id, is_active: next })
      toastSuccess(
        next ? "Teacher activated." : "Teacher deactivated.",
        { id: "teacher-status" }
      )
      setStatusTarget(null)
    } catch (error) {
      toastError(error, "Couldn't update the status.", { id: "teacher-status" })
      throw error
    }
  }

  async function confirmResend() {
    if (!resendTarget) return
    try {
      await resendCredentials.mutateAsync(resendTarget.id)
      toastSuccess("Login credentials resent.", { id: "teacher-resend" })
      setResendTarget(null)
    } catch (error) {
      toastError(error, "Couldn't resend credentials.", { id: "teacher-resend" })
      throw error
    }
  }

  const createButton = (
    <Can permission={TEACHER_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New teacher
      </Button>
    </Can>
  )

  const rowActions = (teacher: Teacher) => (
    <TeacherRowActions
      label={teacherDisplayName(teacher)}
      isActive={isTeacherActive(teacher)}
      canDelete={canDelete}
      onView={() => router.push(`/teachers/${teacher.id}`)}
      onEdit={() => openEdit(teacher)}
      onChangePhoto={() => setPhotoTarget(teacher)}
      onToggleStatus={() => setStatusTarget(teacher)}
      onResendCredentials={() => setResendTarget(teacher)}
      onDelete={() => setDeleteTarget(teacher)}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Teachers
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Manage teacher profiles, assignments, and access.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Can permission={TEACHER_DELETE}>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/teachers/trash" />}
              className="shrink-0"
            >
              <Trash2 className="size-4" aria-hidden />
              Trash
            </Button>
          </Can>
          {createButton}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, email, or ID…"
            aria-label="Search teachers"
            className="h-9 pl-8"
          />
        </div>
        <div className="sm:w-48">
          <StatusFilterSelect value={status} onValueChange={changeStatus} />
        </div>
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {selectable && selectedCount > 0 ? (
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
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Move to trash
            </Button>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <TableSkeleton rows={8} columns={columnCount} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the teachers."
          onRetry={() => void refetch()}
        />
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No matching teachers" : "No teachers yet"}
          description={
            hasFilters
              ? "No teachers match the current search or filter."
              : "Add a teacher to get started — credentials are emailed automatically."
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
                  {selectable ? (
                    <TableHead className="w-px">
                      <SelectCheckbox
                        checked={allOnPageSelected}
                        indeterminate={selectedCount > 0}
                        onChange={toggleAll}
                        label="Select all teachers on this page"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Status</TableHead>
                  {isSuperAdmin ? <TableHead>Branch</TableHead> : null}
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => {
                  const subjects = teacherSubjectNames(teacher)
                  const classes = teacherClassNames(teacher)
                  return (
                    <TableRow
                      key={teacher.id}
                      data-selected={selected.has(teacher.id)}
                      className="cursor-pointer"
                      onClick={() => router.push(`/teachers/${teacher.id}`)}
                    >
                      {selectable ? (
                        <TableCell
                          className="w-px"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectCheckbox
                            checked={selected.has(teacher.id)}
                            onChange={(checked) =>
                              toggleOne(teacher.id, checked)
                            }
                            label={`Select ${teacherDisplayName(teacher)}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <TeacherIdentity teacher={teacher} />
                      </TableCell>
                      <TableCell className="text-copy-secondary">
                        {subjects.length > 0 ? subjects.join(", ") : EMPTY}
                      </TableCell>
                      <TableCell className="text-copy-secondary">
                        {classes.length > 0 ? classes.join(", ") : EMPTY}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={isTeacherActive(teacher) ? "Active" : "Inactive"}
                        />
                      </TableCell>
                      {isSuperAdmin ? (
                        <TableCell className="text-copy-secondary">
                          {teacher.branch_name || EMPTY}
                        </TableCell>
                      ) : null}
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(teacher)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="teacher"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {teachers.map((teacher) => {
              const subjects = teacherSubjectNames(teacher)
              const classes = teacherClassNames(teacher)
              return (
                <li
                  key={teacher.id}
                  data-selected={selected.has(teacher.id)}
                  className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
                >
                  {selectable ? (
                    <span className="pt-1">
                      <SelectCheckbox
                        checked={selected.has(teacher.id)}
                        onChange={(checked) => toggleOne(teacher.id, checked)}
                        label={`Select ${teacherDisplayName(teacher)}`}
                      />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col gap-2 text-left"
                    onClick={() => router.push(`/teachers/${teacher.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <TeacherIdentity teacher={teacher} />
                      <StatusBadge
                        status={isTeacherActive(teacher) ? "Active" : "Inactive"}
                      />
                    </div>
                    {subjects.length > 0 ? (
                      <p className="truncate text-sm text-copy-muted">
                        {subjects.join(", ")}
                      </p>
                    ) : null}
                    {classes.length > 0 ? (
                      <p className="truncate text-xs text-copy-muted">
                        {classes.join(", ")}
                      </p>
                    ) : null}
                    {isSuperAdmin && teacher.branch_name ? (
                      <p className="text-xs text-copy-muted">
                        {teacher.branch_name}
                      </p>
                    ) : null}
                  </button>
                  {rowActions(teacher)}
                </li>
              )
            })}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="teacher"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <TeacherFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={editing}
      />
      <TeacherPhotoDialog
        open={photoTarget != null}
        onOpenChange={(open) => !open && setPhotoTarget(null)}
        teacher={photoTarget}
      />
      <ConfirmDialog
        open={statusTarget != null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget && isTeacherActive(statusTarget)
            ? "Deactivate teacher"
            : "Activate teacher"
        }
        description={
          statusTarget ? (
            <>
              {isTeacherActive(statusTarget)
                ? "Deactivate "
                : "Activate "}
              <span className="font-medium">
                {teacherDisplayName(statusTarget)}
              </span>
              ? {isTeacherActive(statusTarget)
                ? "They will lose access until reactivated."
                : "They will regain access."}
            </>
          ) : null
        }
        confirmLabel={
          statusTarget && isTeacherActive(statusTarget)
            ? "Deactivate"
            : "Activate"
        }
        pendingLabel="Updating…"
        onConfirm={confirmToggleStatus}
      />
      <ConfirmDialog
        open={resendTarget != null}
        onOpenChange={(open) => !open && setResendTarget(null)}
        title="Resend credentials"
        description={
          resendTarget ? (
            <>
              Generate and email fresh login credentials to{" "}
              <span className="font-medium">
                {teacherDisplayName(resendTarget)}
              </span>
              {resendTarget.email ? ` (${resendTarget.email})` : ""}?
            </>
          ) : null
        }
        confirmLabel="Resend"
        pendingLabel="Sending…"
        onConfirm={confirmResend}
      />
      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Move teacher to trash"
        description={
          deleteTarget ? (
            <>
              Move{" "}
              <span className="font-medium">
                {teacherDisplayName(deleteTarget)}
              </span>{" "}
              to trash? The teacher can be restored later from the trash view.
            </>
          ) : null
        }
        confirmLabel="Move to trash"
        onConfirm={confirmDelete}
      />
      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Move ${selectedCount} teacher${selectedCount === 1 ? "" : "s"} to trash`}
        description={
          <>
            Move the {selectedCount} selected teacher
            {selectedCount === 1 ? "" : "s"} to trash?
            {selectedCount === 1 ? " This teacher" : " These teachers"} can be
            restored later from the trash view.
          </>
        }
        confirmLabel={`Move ${selectedCount}`}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

function TeacherIdentity({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {teacher.photo_url ? (
          <AvatarImage src={teacher.photo_url} alt="" />
        ) : null}
        <AvatarFallback>{teacherInitials(teacher)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-copy-primary">
          {teacherDisplayName(teacher)}
        </p>
        <p className="truncate text-xs text-copy-muted">
          {teacher.designation || teacher.email || teacher.employee_id || ""}
        </p>
      </div>
    </div>
  )
}

