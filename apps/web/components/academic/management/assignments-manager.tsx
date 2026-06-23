"use client"

/**
 * Teacher assignments management (task 2.3): list class-teacher / subject-teacher
 * assignments with `teacher_id` / `class_id` / `session_id` filters, plus
 * create/edit/delete (write actions gated by `academic.manage`). Reads via
 * `useTeacherAssignments`; writes invalidate that cache. Implements all four
 * states — loading / empty / error / loaded — and is responsive (table ≥ md,
 * stacked cards below).
 */

import * as React from "react"
import { ClipboardList, Plus, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { TableSkeleton } from "@/components/skeletons"
import { ClassSelect, SessionSelect } from "@/components/academic"
import { TeacherSelect } from "@/components/teachers/teacher-select"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useTeacherAssignments,
  useDeleteTeacherAssignment,
} from "@/hooks/academic"
import { assignmentLabels, type TeacherAssignment } from "@/types/academic"
import { ASSIGNMENT_MANAGE } from "./permissions"
import { DeleteDialog } from "./delete-dialog"
import { RowActions } from "./row-actions"
import { AssignmentFormDialog } from "./assignment-form-dialog"

const EMPTY = "—"

function teacherLabel(a: TeacherAssignment) {
  return assignmentLabels(a).teacher
}
function classLabel(a: TeacherAssignment) {
  return assignmentLabels(a).class
}

export function AssignmentsManager() {
  const [teacherId, setTeacherId] = React.useState<number | null>(null)
  const [classId, setClassId] = React.useState<number | null>(null)
  const [sessionId, setSessionId] = React.useState<number | null>(null)

  const { data, isLoading, isError, refetch } = useTeacherAssignments({
    teacher_id: teacherId,
    class_id: classId,
    session_id: sessionId,
  })
  const deleteMutation = useDeleteTeacherAssignment()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TeacherAssignment | undefined>()
  const [deleting, setDeleting] = React.useState<TeacherAssignment | null>(null)

  const hasFilters = teacherId != null || classId != null || sessionId != null

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(assignment: TeacherAssignment) {
    setEditing(assignment)
    setFormOpen(true)
  }

  function clearFilters() {
    setTeacherId(null)
    setClassId(null)
    setSessionId(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toastSuccess("Assignment deleted.", { id: "assignment-delete" })
      setDeleting(null)
    } catch (error) {
      toastError(error, "Couldn't delete the assignment.", {
        id: "assignment-delete",
      })
      throw error
    }
  }

  const createButton = (
    <Can permission={ASSIGNMENT_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New assignment
      </Button>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-copy-primary">
            Teacher assignments
          </h2>
          <p className="text-sm text-copy-muted">
            Class-teacher and subject-teacher assignments.
          </p>
        </div>
        {createButton}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Filter label="Teacher">
          <TeacherSelect
            value={teacherId}
            onValueChange={setTeacherId}
            aria-label="Filter by teacher"
          />
        </Filter>
        <Filter label="Class">
          <ClassSelect
            value={classId}
            onValueChange={setClassId}
            aria-label="Filter by class"
          />
        </Filter>
        <Filter label="Session">
          <SessionSelect
            value={sessionId}
            onValueChange={setSessionId}
            aria-label="Filter by session"
          />
        </Filter>
        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="sm:mb-0.5"
          >
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the assignments."
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? "No matching assignments" : "No assignments yet"}
          description={
            hasFilters
              ? "No assignments match the current filters."
              : "Assign a teacher to a class to get started."
          }
          action={hasFilters ? undefined : createButton}
        />
      ) : (
        <AssignmentList
          assignments={data}
          onEdit={openEdit}
          onDelete={(a) => setDeleting(a)}
        />
      )}

      <AssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assignment={editing}
      />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete assignment"
        description={
          <>
            Remove{" "}
            <span className="font-medium">
              {deleting ? teacherLabel(deleting) : ""}
            </span>{" "}
            from{" "}
            <span className="font-medium">
              {deleting ? classLabel(deleting) : ""}
            </span>
            ? This can&apos;t be undone.
          </>
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function Filter({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
      <span className="text-xs font-medium text-copy-muted">{label}</span>
      {children}
    </label>
  )
}

interface AssignmentListProps {
  assignments: TeacherAssignment[]
  onEdit: (assignment: TeacherAssignment) => void
  onDelete: (assignment: TeacherAssignment) => void
}

function AssignmentList({
  assignments,
  onEdit,
  onDelete,
}: AssignmentListProps) {
  return (
    <>
      {/* Table ≥ md */}
      <div className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Subject</TableHead>
              <Can permission={ASSIGNMENT_MANAGE}>
                <TableHead className="w-px text-right">Actions</TableHead>
              </Can>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => {
              const labels = assignmentLabels(assignment)
              return (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium text-copy-primary">
                  {labels.teacher}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {labels.class}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {labels.section || EMPTY}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {labels.subject || EMPTY}
                </TableCell>
                <Can permission={ASSIGNMENT_MANAGE}>
                  <TableCell className="text-right">
                    <RowActions
                      label={teacherLabel(assignment)}
                      onEdit={() => onEdit(assignment)}
                      onDelete={() => onDelete(assignment)}
                    />
                  </TableCell>
                </Can>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Card list < md */}
      <ul className="flex flex-col gap-3 md:hidden">
        {assignments.map((assignment) => {
          const labels = assignmentLabels(assignment)
          return (
          <li
            key={assignment.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-copy-primary">
                {labels.teacher}
              </p>
              <p className="truncate text-sm text-copy-muted">
                {labels.class}
                {labels.section ? ` · ${labels.section}` : ""}
                {labels.subject ? ` · ${labels.subject}` : ""}
              </p>
            </div>
            <Can permission={ASSIGNMENT_MANAGE}>
              <RowActions
                label={teacherLabel(assignment)}
                onEdit={() => onEdit(assignment)}
                onDelete={() => onDelete(assignment)}
              />
            </Can>
          </li>
          )
        })}
      </ul>
    </>
  )
}
