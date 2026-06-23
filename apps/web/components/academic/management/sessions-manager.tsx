"use client"

/**
 * Sessions management (task 2.2): list every academic session with create/edit/
 * delete (write actions gated by `academic.manage`). Reads via the shared
 * `useSessions` hook (task 2.1) so writes here invalidate the same cache the
 * selectors consume. Implements all four states — loading / empty / error /
 * loaded — and is responsive (table ≥ md, stacked cards below).
 */

import * as React from "react"
import { CalendarRange, Plus } from "lucide-react"

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
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatDateRange } from "@/lib/format"
import { useSessions, useDeleteSession } from "@/hooks/academic"
import type { AcademicSession } from "@/types/academic"
import { ACADEMIC_MANAGE } from "./permissions"
import { DeleteDialog } from "./delete-dialog"
import { RowActions } from "./row-actions"
import { SessionFormDialog } from "./session-form-dialog"

export function SessionsManager() {
  const { data, isLoading, isError, refetch } = useSessions()
  const deleteMutation = useDeleteSession()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AcademicSession | undefined>()
  const [deleting, setDeleting] = React.useState<AcademicSession | null>(null)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(session: AcademicSession) {
    setEditing(session)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toastSuccess("Session deleted.", { id: "session-delete" })
      setDeleting(null)
    } catch (error) {
      toastError(error, "Couldn't delete the session.", { id: "session-delete" })
      throw error
    }
  }

  const createButton = (
    <Can permission={ACADEMIC_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New session
      </Button>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-copy-primary">Sessions</h2>
          <p className="text-sm text-copy-muted">
            Academic years/terms used across the app.
          </p>
        </div>
        {createButton}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the sessions."
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No sessions yet"
          description="Create your first academic session to get started."
          action={createButton}
        />
      ) : (
        <SessionList
          sessions={data}
          onEdit={openEdit}
          onDelete={(s) => setDeleting(s)}
        />
      )}

      <SessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        session={editing}
      />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete session"
        description={
          <>
            Delete <span className="font-medium">{deleting?.name}</span>? This
            can&apos;t be undone.
          </>
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}

interface SessionListProps {
  sessions: AcademicSession[]
  onEdit: (session: AcademicSession) => void
  onDelete: (session: AcademicSession) => void
}

function SessionList({ sessions, onEdit, onDelete }: SessionListProps) {
  return (
    <>
      {/* Table ≥ md */}
      <div className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Status</TableHead>
              <Can permission={ACADEMIC_MANAGE}>
                <TableHead className="w-px text-right">Actions</TableHead>
              </Can>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium text-copy-primary">
                  {session.name}
                </TableCell>
                <TableCell className="font-mono text-copy-secondary">
                  {formatDateRange(session.start_date, session.end_date)}
                </TableCell>
                <TableCell>
                  {session.is_current ? (
                    <StatusBadge status="active" label="Current" />
                  ) : (
                    <span className="text-copy-muted">—</span>
                  )}
                </TableCell>
                <Can permission={ACADEMIC_MANAGE}>
                  <TableCell className="text-right">
                    <RowActions
                      label={session.name}
                      onEdit={() => onEdit(session)}
                      onDelete={() => onDelete(session)}
                    />
                  </TableCell>
                </Can>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Card list < md */}
      <ul className="flex flex-col gap-3 md:hidden">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-copy-primary">
                  {session.name}
                </p>
                {session.is_current ? (
                  <StatusBadge status="active" label="Current" />
                ) : null}
              </div>
              <p className="font-mono text-sm text-copy-muted">
                {formatDateRange(session.start_date, session.end_date)}
              </p>
            </div>
            <Can permission={ACADEMIC_MANAGE}>
              <RowActions
                label={session.name}
                onEdit={() => onEdit(session)}
                onDelete={() => onDelete(session)}
              />
            </Can>
          </li>
        ))}
      </ul>
    </>
  )
}
