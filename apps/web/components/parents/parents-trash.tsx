"use client"

/**
 * Parents trash: soft-deleted parent rows from `GET /parents/trash`, with
 * restore and permanent-delete actions. The API remains authoritative for
 * force-delete conflicts such as linked accounts or dependent records.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  RotateCcw,
  Search,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
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
  useBulkForceDeleteParents,
  useBulkRestoreParents,
  useForceDeleteParent,
  useRestoreParent,
  useTrashedParents,
} from "@/hooks/parents"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  linkedStudentLabel,
  parentRelationLabel,
  type ParentProfile,
} from "@/types/parent"

const EMPTY = "—"

export function ParentsTrash() {
  const [searchInput, setSearchInput] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [forceTarget, setForceTarget] = React.useState<ParentProfile | null>(
    null
  )
  const [bulkForceOpen, setBulkForceOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const search = useDebouncedValue(searchInput, 300)
  const { data, isPending, isError, isFetching, refetch } = useTrashedParents({
    search,
    page,
  })

  const restore = useRestoreParent()
  const bulkRestore = useBulkRestoreParents()
  const forceDelete = useForceDeleteParent()
  const bulkForceDelete = useBulkForceDeleteParents()

  const parents = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasSearch = search.trim().length > 0
  const selectedParents = parents.filter((parent) => selected.has(parent.id))
  const selectedCount = selectedParents.length
  const allOnPageSelected =
    parents.length > 0 && selectedCount === parents.length

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
      checked ? new Set(parents.map((parent) => parent.id)) : new Set()
    )
  }

  async function restoreOne(parent: ParentProfile) {
    try {
      await restore.mutateAsync(parent.id)
      toastSuccess("Parent restored.", { id: "parent-restore" })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(parent.id)
        return next
      })
    } catch (error) {
      toastError(error, "Couldn't restore the parent.", {
        id: "parent-restore",
      })
    }
  }

  async function restoreSelected() {
    const ids = selectedParents.map((parent) => parent.id)
    if (ids.length === 0) return
    try {
      await bulkRestore.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Parent restored."
          : `${ids.length} parents restored.`,
        { id: "parent-bulk-restore" }
      )
      setSelected(new Set())
    } catch (error) {
      toastError(error, "Couldn't restore the parents.", {
        id: "parent-bulk-restore",
      })
    }
  }

  async function confirmForceDelete() {
    if (!forceTarget) return
    try {
      await forceDelete.mutateAsync(forceTarget.id)
      toastSuccess("Parent permanently deleted.", {
        id: "parent-force-delete",
      })
      setForceTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the parent.", {
        id: "parent-force-delete",
      })
      throw error
    }
  }

  async function confirmBulkForceDelete() {
    const ids = selectedParents.map((parent) => parent.id)
    if (ids.length === 0) return
    try {
      await bulkForceDelete.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Parent permanently deleted."
          : `${ids.length} parents permanently deleted.`,
        { id: "parent-bulk-force-delete" }
      )
      setSelected(new Set())
      setBulkForceOpen(false)
    } catch (error) {
      toastError(error, "Couldn't delete the parents.", {
        id: "parent-bulk-force-delete",
      })
      throw error
    }
  }

  const rowActions = (parent: ParentProfile) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        loading={restore.isPending}
        onClick={() => void restoreOne(parent)}
        title="Restore parent"
      >
        <RotateCcw className="size-4" aria-hidden />
        <span className="sr-only">Restore {parent.name}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setForceTarget(parent)}
        title="Delete permanently"
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="sr-only">Permanently delete {parent.name}</span>
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
          render={<Link href="/parents" />}
          className="-ml-2 w-fit text-copy-muted"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to parents
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Parent trash
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Restore deleted parent accounts or delete them permanently.
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
            placeholder="Search by parent name or phone..."
            aria-label="Search trashed parents"
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
          description="We couldn't load the parent trash."
          onRetry={() => void refetch()}
        />
      ) : parents.length === 0 ? (
        <EmptyState
          icon={UserRoundPlus}
          title={hasSearch ? "No matching parents" : "Trash is empty"}
          description={
            hasSearch
              ? "No deleted parent accounts match the current search."
              : "Deleted parent accounts will appear here."
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
                      label="Select all parents on this page"
                    />
                  </TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Linked students</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((parent) => (
                  <TableRow
                    key={parent.id}
                    data-selected={selected.has(parent.id)}
                  >
                    <TableCell className="w-px">
                      <SelectCheckbox
                        checked={selected.has(parent.id)}
                        onChange={(checked) => toggleOne(parent.id, checked)}
                        label={`Select ${parent.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <ParentIdentity parent={parent} />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-mono text-sm">
                          {parent.phone || EMPTY}
                        </span>
                        <span className="truncate text-xs text-copy-muted">
                          {parent.email || "No email"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <LinkedStudentsSummary parent={parent} />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {deletedOn(parent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rowActions(parent)}
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
                unit="parent"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {parents.map((parent) => (
              <li
                key={parent.id}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4"
                data-selected={selected.has(parent.id)}
              >
                <div className="flex items-start gap-2.5">
                  <span className="pt-1">
                    <SelectCheckbox
                      checked={selected.has(parent.id)}
                      onChange={(checked) => toggleOne(parent.id, checked)}
                      label={`Select ${parent.name}`}
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <ParentIdentity parent={parent} />
                    <p className="truncate font-mono text-sm text-copy-secondary">
                      {parent.phone || EMPTY}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {parent.email || "No email"} · Deleted {deletedOn(parent)}
                    </p>
                    <LinkedStudentsSummary parent={parent} />
                  </div>
                </div>
                {rowActions(parent)}
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="parent"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <DeleteDialog
        open={forceTarget != null}
        onOpenChange={(open) => !open && setForceTarget(null)}
        title="Delete parent permanently"
        description={
          forceTarget ? (
            <>
              Permanently delete{" "}
              <span className="font-medium">{forceTarget.name}</span>? This
              can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        onConfirm={confirmForceDelete}
      />
      <DeleteDialog
        open={bulkForceOpen}
        onOpenChange={setBulkForceOpen}
        title={`Delete ${selectedCount} parent${selectedCount === 1 ? "" : "s"} permanently`}
        description={
          <>
            Permanently delete the {selectedCount} selected parent
            {selectedCount === 1 ? "" : "s"}? This can&apos;t be undone.
          </>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={confirmBulkForceDelete}
      />
    </div>
  )
}

function ParentIdentity({ parent }: { parent: ParentProfile }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-dim text-sm font-semibold text-brand">
        {parentInitials(parent.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-copy-primary">
          {parent.name || EMPTY}
        </p>
        <p className="truncate text-xs text-copy-muted">
          {parentRelationLabel(parent.relation)}
        </p>
      </div>
    </div>
  )
}

function LinkedStudentsSummary({ parent }: { parent: ParentProfile }) {
  const students = parent.students ?? []
  if (students.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-copy-muted">
        <Users className="size-4" aria-hidden />
        No linked students
      </div>
    )
  }

  const preview = students.slice(0, 2).map(linkedStudentLabel).join(", ")
  const remaining = students.length > 2 ? ` +${students.length - 2} more` : ""

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge variant="outline">{students.length} linked</Badge>
      <span className="min-w-0 truncate text-sm text-copy-muted">
        {preview}
        {remaining}
      </span>
    </div>
  )
}

function deletedOn(parent: ParentProfile): string {
  return parent.deleted_at ? formatDate(parent.deleted_at) : EMPTY
}

function parentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "P"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
