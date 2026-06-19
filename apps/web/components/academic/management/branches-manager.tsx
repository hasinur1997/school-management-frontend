"use client"

/**
 * Branch management (task 2.3) — super-admin only. Lists branches with
 * create/edit/delete; this is the source for the 1.5 branch switcher, so writes
 * invalidate the shared `["branches"]` key (in the mutation hooks) and the
 * switcher refreshes. Implements all four states — loading / empty / error /
 * loaded — and is responsive (table ≥ md, stacked cards below).
 *
 * The whole surface is gated on super admin by the caller; the API's `403`
 * stays the real boundary.
 */

import * as React from "react"
import { Building2, Plus } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { TableSkeleton } from "@/components/skeletons"
import { toastError, toastSuccess } from "@/lib/toast"
import { useBranches } from "@/hooks/branches/use-branches"
import { useDeleteBranch } from "@/hooks/branches/use-branch-mutations"
import type { Branch } from "@/types/branch"
import { DeleteDialog } from "./delete-dialog"
import { RowActions } from "./row-actions"
import { BranchFormDialog } from "./branch-form-dialog"

const EMPTY = "—"

export function BranchesManager() {
  const { data, isLoading, isError, refetch } = useBranches()
  const deleteMutation = useDeleteBranch()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Branch | undefined>()
  const [deleting, setDeleting] = React.useState<Branch | null>(null)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(branch: Branch) {
    setEditing(branch)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync(deleting.id)
      toastSuccess("Branch deleted.", { id: "branch-delete" })
      setDeleting(null)
    } catch (error) {
      toastError(error, "Couldn't delete the branch.", { id: "branch-delete" })
      throw error
    }
  }

  const createButton = (
    <Button onClick={openCreate}>
      <Plus className="size-4" aria-hidden />
      New branch
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-copy-primary">Branches</h2>
          <p className="text-sm text-copy-muted">
            Campuses across the organization (super admin only).
          </p>
        </div>
        {createButton}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the branches."
          onRetry={() => void refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Create your first branch to get started."
          action={createButton}
        />
      ) : (
        <BranchList
          branches={data}
          onEdit={openEdit}
          onDelete={(b) => setDeleting(b)}
        />
      )}

      <BranchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branch={editing}
      />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete branch"
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

interface BranchListProps {
  branches: Branch[]
  onEdit: (branch: Branch) => void
  onDelete: (branch: Branch) => void
}

function BranchList({ branches, onEdit, onDelete }: BranchListProps) {
  return (
    <>
      {/* Table ≥ md */}
      <div className="hidden rounded-xl border border-surface-border bg-surface md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-px text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="font-medium text-copy-primary">
                  {branch.name}
                </TableCell>
                <TableCell className="font-mono text-copy-secondary">
                  {branch.code || EMPTY}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {branch.contact || EMPTY}
                </TableCell>
                <TableCell className="text-right">
                  <RowActions
                    label={branch.name}
                    onEdit={() => onEdit(branch)}
                    onDelete={() => onDelete(branch)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Card list < md */}
      <ul className="flex flex-col gap-3 md:hidden">
        {branches.map((branch) => (
          <li
            key={branch.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-copy-primary">
                  {branch.name}
                </p>
                {branch.code ? (
                  <span className="shrink-0 font-mono text-xs text-copy-muted">
                    {branch.code}
                  </span>
                ) : null}
              </div>
              {branch.contact ? (
                <p className="truncate text-sm text-copy-muted">
                  {branch.contact}
                </p>
              ) : null}
            </div>
            <RowActions
              label={branch.name}
              onEdit={() => onEdit(branch)}
              onDelete={() => onDelete(branch)}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
