"use client"

/**
 * Nested sections + subjects management for a single class (task 2.2), rendered
 * inside an expanded class row. Mounted only when the class is expanded, so the
 * dependent `useSections`/`useSubjects` reads (task 2.1) fire on demand. Each
 * group implements its own loading / empty / error / loaded states and gates
 * its write actions behind `academic.manage`.
 */

import * as React from "react"
import { Layers, Library, Loader2, Plus, type LucideIcon } from "lucide-react"

import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useSections,
  useSubjects,
  useDeleteSection,
  useDeleteSubject,
} from "@/hooks/academic"
import type { Section, Subject } from "@/types/academic"
import { ACADEMIC_MANAGE } from "./permissions"
import { DeleteDialog } from "./delete-dialog"
import { RowActions } from "./row-actions"
import { SectionFormDialog } from "./section-form-dialog"
import { SubjectFormDialog } from "./subject-form-dialog"

export function ClassChildren({ classId }: { classId: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-surface-border bg-subtle/50 p-3 sm:p-4 lg:grid-cols-2">
      <SectionsGroup classId={classId} />
      <SubjectsGroup classId={classId} />
    </div>
  )
}

function SectionsGroup({ classId }: { classId: string }) {
  const { data, isLoading, isError, refetch } = useSections(classId)
  const deleteMutation = useDeleteSection()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Section | undefined>()
  const [deleting, setDeleting] = React.useState<Section | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toastSuccess("Section deleted.", { id: "section-delete" })
      setDeleting(null)
    } catch (error) {
      toastError(error, "Couldn't delete the section.", { id: "section-delete" })
      throw error
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3.5">
      <ChildHeader
        icon={Layers}
        title="Sections"
        count={data?.length}
        onAdd={() => {
          setEditing(undefined)
          setFormOpen(true)
        }}
      />
      <ChildBody
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={!data || data.length === 0}
        emptyLabel="No sections in this class yet."
      >
        {data?.map((section) => (
          <ChildRow
            key={section.id}
            label={section.name}
            meta={section.capacity != null ? `Cap. ${section.capacity}` : null}
            onEdit={() => {
              setEditing(section)
              setFormOpen(true)
            }}
            onDelete={() => setDeleting(section)}
          />
        ))}
      </ChildBody>

      <SectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        classId={classId}
        section={editing}
      />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete section"
        description={
          <>
            Delete section{" "}
            <span className="font-medium">{deleting?.name}</span>?
          </>
        }
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function SubjectsGroup({ classId }: { classId: string }) {
  const { data, isLoading, isError, refetch } = useSubjects(classId)
  const deleteMutation = useDeleteSubject()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Subject | undefined>()
  const [deleting, setDeleting] = React.useState<Subject | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toastSuccess("Subject deleted.", { id: "subject-delete" })
      setDeleting(null)
    } catch (error) {
      toastError(error, "Couldn't delete the subject.", { id: "subject-delete" })
      throw error
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3.5">
      <ChildHeader
        icon={Library}
        title="Subjects"
        count={data?.length}
        onAdd={() => {
          setEditing(undefined)
          setFormOpen(true)
        }}
      />
      <ChildBody
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={!data || data.length === 0}
        emptyLabel="No subjects in this class yet."
      >
        {data?.map((subject) => (
          <ChildRow
            key={subject.id}
            label={subject.name}
            meta={subject.code ?? null}
            onEdit={() => {
              setEditing(subject)
              setFormOpen(true)
            }}
            onDelete={() => setDeleting(subject)}
          />
        ))}
      </ChildBody>

      <SubjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        classId={classId}
        subject={editing}
      />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete subject"
        description={
          <>
            Delete subject{" "}
            <span className="font-medium">{deleting?.name}</span>?
          </>
        }
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function ChildHeader({
  icon: Icon,
  title,
  count,
  onAdd,
}: {
  icon: LucideIcon
  title: string
  count?: number
  onAdd: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-copy-muted" aria-hidden />
        <h4 className="text-sm font-semibold text-copy-primary">{title}</h4>
        {count != null && count > 0 ? (
          <span className="rounded-full bg-subtle px-2 py-0.5 font-mono text-xs leading-none text-copy-muted">
            {count}
          </span>
        ) : null}
      </div>
      <Can permission={ACADEMIC_MANAGE}>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-3.5" aria-hidden />
          Add
        </Button>
      </Can>
    </div>
  )
}

interface ChildBodyProps {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  isEmpty: boolean
  emptyLabel: string
  children: React.ReactNode
}

function ChildBody({
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyLabel,
  children,
}: ChildBodyProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-1 py-3 text-sm text-copy-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    )
  }
  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
        <span>Couldn&apos;t load.</span>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }
  if (isEmpty) {
    return (
      <p className="rounded-lg border border-dashed border-surface-border bg-subtle/40 px-3 py-4 text-center text-sm text-copy-muted">
        {emptyLabel}
      </p>
    )
  }
  return (
    <ul className="divide-y divide-surface-border overflow-hidden rounded-lg border border-surface-border">
      {children}
    </ul>
  )
}

function ChildRow({
  label,
  meta,
  onEdit,
  onDelete,
}: {
  label: string
  meta: string | null
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-2 bg-surface px-3 py-2 transition-colors hover:bg-subtle">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="size-1.5 shrink-0 rounded-full bg-accent-dim ring-2 ring-accent-soft-border"
          aria-hidden
        />
        <span className="truncate text-sm font-medium text-copy-primary">
          {label}
        </span>
        {meta ? (
          <span className="shrink-0 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-xs text-copy-muted">
            {meta}
          </span>
        ) : null}
      </div>
      <Can permission={ACADEMIC_MANAGE}>
        <RowActions label={label} onEdit={onEdit} onDelete={onDelete} />
      </Can>
    </li>
  )
}
