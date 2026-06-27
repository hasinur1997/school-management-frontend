"use client"

/**
 * Teachers trash: soft-deleted teacher rows from `GET /teachers/trash`, with
 * restore and permanent-delete actions (single + bulk). The API remains
 * authoritative for force-delete conflicts such as linked accounts or dependent
 * records. Mirrors the parents/students trash screens.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw, Search, Trash2, Users, X } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { SelectCheckbox } from "@/components/select-checkbox"
import { TableSkeleton } from "@/components/skeletons"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  useBulkForceDeleteTeachers,
  useBulkRestoreTeachers,
  useForceDeleteTeacher,
  useRestoreTeacher,
  useTrashedTeachers,
} from "@/hooks/teachers"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  teacherDisplayName,
  teacherInitials,
  type Teacher,
} from "@/types/teacher"
import { teacherClassNames, teacherSubjectNames } from "./teacher-summary"

const EMPTY = "—"

export function TeachersTrash() {
  const [searchInput, setSearchInput] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [forceTarget, setForceTarget] = React.useState<Teacher | null>(null)
  const [bulkForceOpen, setBulkForceOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const search = useDebouncedValue(searchInput, 300)
  const { data, isPending, isError, isFetching, refetch } = useTrashedTeachers({
    search,
    page,
  })

  const restore = useRestoreTeacher()
  const bulkRestore = useBulkRestoreTeachers()
  const forceDelete = useForceDeleteTeacher()
  const bulkForceDelete = useBulkForceDeleteTeachers()

  const teachers = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasSearch = search.trim().length > 0
  const selectedTeachers = teachers.filter((teacher) => selected.has(teacher.id))
  const selectedCount = selectedTeachers.length
  const allOnPageSelected =
    teachers.length > 0 && selectedCount === teachers.length

  function changeSearch(value: string) {
    setSearchInput(value)
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

  async function restoreOne(teacher: Teacher) {
    try {
      await restore.mutateAsync(teacher.id)
      toastSuccess("Teacher restored.", { id: "teacher-restore" })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(teacher.id)
        return next
      })
    } catch (error) {
      toastError(error, "Couldn't restore the teacher.", {
        id: "teacher-restore",
      })
    }
  }

  async function restoreSelected() {
    const ids = selectedTeachers.map((teacher) => teacher.id)
    if (ids.length === 0) return
    try {
      await bulkRestore.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Teacher restored."
          : `${ids.length} teachers restored.`,
        { id: "teacher-bulk-restore" }
      )
      setSelected(new Set())
    } catch (error) {
      toastError(error, "Couldn't restore the teachers.", {
        id: "teacher-bulk-restore",
      })
    }
  }

  async function confirmForceDelete() {
    if (!forceTarget) return
    try {
      await forceDelete.mutateAsync(forceTarget.id)
      toastSuccess("Teacher permanently deleted.", {
        id: "teacher-force-delete",
      })
      setForceTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the teacher.", {
        id: "teacher-force-delete",
      })
      throw error
    }
  }

  async function confirmBulkForceDelete() {
    const ids = selectedTeachers.map((teacher) => teacher.id)
    if (ids.length === 0) return
    try {
      await bulkForceDelete.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Teacher permanently deleted."
          : `${ids.length} teachers permanently deleted.`,
        { id: "teacher-bulk-force-delete" }
      )
      setSelected(new Set())
      setBulkForceOpen(false)
    } catch (error) {
      toastError(error, "Couldn't delete the teachers.", {
        id: "teacher-bulk-force-delete",
      })
      throw error
    }
  }

  const rowActions = (teacher: Teacher) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        loading={restore.isPending}
        onClick={() => void restoreOne(teacher)}
        title="Restore teacher"
      >
        <RotateCcw className="size-4" aria-hidden />
        <span className="sr-only">Restore {teacherDisplayName(teacher)}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setForceTarget(teacher)}
        title="Delete permanently"
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="sr-only">
          Permanently delete {teacherDisplayName(teacher)}
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
          render={<Link href="/teachers" />}
          className="-ml-2 w-fit text-copy-muted"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to teachers
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Teacher trash
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Restore deleted teachers or delete them permanently.
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
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Search by name, email, or ID…"
            aria-label="Search trashed teachers"
            className="h-9 pl-8"
          />
        </div>
        {hasSearch ? (
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setSearchInput("")
                setPage(1)
              }}
            >
              <X className="size-4" aria-hidden />
              Clear search
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
        <TableSkeleton rows={8} columns={6} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the teacher trash."
          onRetry={() => void refetch()}
        />
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasSearch ? "No matching teachers" : "Trash is empty"}
          description={
            hasSearch
              ? "No deleted teachers match the current search."
              : "Deleted teachers will appear here."
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
                      label="Select all teachers on this page"
                    />
                  </TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Deleted</TableHead>
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
                    >
                      <TableCell className="w-px">
                        <SelectCheckbox
                          checked={selected.has(teacher.id)}
                          onChange={(checked) => toggleOne(teacher.id, checked)}
                          label={`Select ${teacherDisplayName(teacher)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <TeacherIdentity teacher={teacher} />
                      </TableCell>
                      <TableCell className="text-copy-secondary">
                        {subjects.length > 0 ? subjects.join(", ") : EMPTY}
                      </TableCell>
                      <TableCell className="text-copy-secondary">
                        {classes.length > 0 ? classes.join(", ") : EMPTY}
                      </TableCell>
                      <TableCell className="text-copy-secondary">
                        {deletedOn(teacher)}
                      </TableCell>
                      <TableCell className="text-right">
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

          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {teachers.map((teacher) => {
              const subjects = teacherSubjectNames(teacher)
              const classes = teacherClassNames(teacher)
              return (
                <li
                  key={teacher.id}
                  className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4"
                  data-selected={selected.has(teacher.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="pt-1">
                      <SelectCheckbox
                        checked={selected.has(teacher.id)}
                        onChange={(checked) => toggleOne(teacher.id, checked)}
                        label={`Select ${teacherDisplayName(teacher)}`}
                      />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <TeacherIdentity teacher={teacher} />
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
                      <p className="truncate text-xs text-copy-muted">
                        Deleted {deletedOn(teacher)}
                      </p>
                    </div>
                  </div>
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

      <DeleteDialog
        open={forceTarget != null}
        onOpenChange={(open) => !open && setForceTarget(null)}
        title="Delete teacher permanently"
        description={
          forceTarget ? (
            <>
              Permanently delete{" "}
              <span className="font-medium">
                {teacherDisplayName(forceTarget)}
              </span>
              ? This can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        onConfirm={confirmForceDelete}
      />
      <DeleteDialog
        open={bulkForceOpen}
        onOpenChange={setBulkForceOpen}
        title={`Delete ${selectedCount} teacher${selectedCount === 1 ? "" : "s"} permanently`}
        description={
          <>
            Permanently delete the {selectedCount} selected teacher
            {selectedCount === 1 ? "" : "s"}? This can&apos;t be undone.
          </>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={confirmBulkForceDelete}
      />
    </div>
  )
}

function TeacherIdentity({ teacher }: { teacher: Teacher }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {teacher.photo_url ? <AvatarImage src={teacher.photo_url} alt="" /> : null}
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

function deletedOn(teacher: Teacher): string {
  return teacher.deleted_at ? formatDate(teacher.deleted_at) : EMPTY
}
