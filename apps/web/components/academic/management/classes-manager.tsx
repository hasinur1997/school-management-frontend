"use client"

/**
 * Classes management (task 2.2): list every class with create/edit/delete, plus
 * an expandable detail per class for managing its sections and subjects
 * (`ClassChildren`). Reads via the shared `useClasses` hook (task 2.1); writes
 * invalidate that cache. All four states (loading / empty / error / loaded) are
 * handled and the layout is responsive (accordion cards at every width).
 */

import * as React from "react"
import { BookOpen, ChevronDown, Plus } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { CardSkeleton } from "@/components/skeletons"
import { toastError, toastSuccess } from "@/lib/toast"
import { useClasses, useDeleteClass } from "@/hooks/academic"
import type { SchoolClass } from "@/types/academic"
import { ACADEMIC_MANAGE } from "./permissions"
import { ClassChildren } from "./class-children"
import { ClassFormDialog } from "./class-form-dialog"
import { DeleteDialog } from "./delete-dialog"
import { RowActions } from "./row-actions"

export function ClassesManager() {
  const { data, isLoading, isError, refetch } = useClasses()
  const deleteMutation = useDeleteClass()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SchoolClass | undefined>()
  const [deleting, setDeleting] = React.useState<SchoolClass | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function toggle(id: string) {
    setExpanded((current) => (current === id ? null : id))
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toastSuccess("Class deleted.", { id: "class-delete" })
      setDeleting(null)
    } catch (error) {
      toastError(error, "Couldn't delete the class.", { id: "class-delete" })
      throw error
    }
  }

  const createButton = (
    <Can permission={ACADEMIC_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New class
      </Button>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-copy-primary">Classes</h2>
          <p className="text-sm text-copy-muted">
            Classes with their sections and subjects.
          </p>
        </div>
        {createButton}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={1} />
          ))}
        </div>
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the classes."
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description="Create your first class, then add its sections and subjects."
          action={createButton}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((schoolClass) => (
            <ClassRow
              key={schoolClass.id}
              schoolClass={schoolClass}
              expanded={expanded === schoolClass.id}
              onToggle={() => toggle(schoolClass.id)}
              onEdit={() => {
                setEditing(schoolClass)
                setFormOpen(true)
              }}
              onDelete={() => setDeleting(schoolClass)}
            />
          ))}
        </ul>
      )}

      <ClassFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        schoolClass={editing}
      />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete class"
        description={
          <>
            Delete <span className="font-medium">{deleting?.name}</span> and all
            its sections and subjects? This can&apos;t be undone.
          </>
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}

interface ClassRowProps {
  schoolClass: SchoolClass
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

function ClassRow({
  schoolClass,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: ClassRowProps) {
  const panelId = `class-${schoolClass.id}-children`

  return (
    <li className="overflow-hidden rounded-xl border border-surface-border bg-surface">
      <div className="flex items-center gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-copy-muted transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block truncate font-medium text-copy-primary">
              {schoolClass.name}
            </span>
            {schoolClass.numeric_level != null ? (
              <span className="block truncate text-xs text-copy-muted">
                Level {schoolClass.numeric_level}
              </span>
            ) : null}
          </span>
        </button>
        <Can permission={ACADEMIC_MANAGE}>
          <RowActions
            label={schoolClass.name}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Can>
      </div>
      {expanded ? (
        <div id={panelId}>
          <ClassChildren classId={schoolClass.id} />
        </div>
      ) : null}
    </li>
  )
}
