"use client"

/**
 * Admissions trash: the soft-deleted application queue. Lists records returned by
 * `GET /admissions/trash` (any lifecycle status) with the same search + class
 * filters as the live queue, and exposes the two terminal actions —
 * **restore** (move back to the live queue) and **permanent delete** (irreversible
 * force-delete) — both per-row and in bulk. Implements all four states
 * (loading / empty / error / loaded) and is responsive (table ≥ md, cards below).
 *
 * Restore is reversible, so it runs straight from the button with a toast; the
 * permanent delete confirms first via the shared destructive dialog. All actions
 * are gated by `admissions.manage`; the API stays the real boundary.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw, Search, Trash2, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { SelectCheckbox } from "@/components/select-checkbox"
import { ClassSelect } from "@/components/academic"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useTrashedAdmissions,
  useRestoreAdmission,
  useBulkRestoreAdmission,
  useForceDeleteAdmission,
  useBulkForceDeleteAdmission,
} from "@/hooks/admissions"
import {
  admissionApplicantName,
  statusClassName,
  type Admission,
} from "@/types/admission"
import { admissionStatusLabel, admissionStatusTone } from "./admission-tone"

const EMPTY = "—"

export function AdmissionsTrash() {
  const [searchInput, setSearchInput] = React.useState("")
  const [classId, setClassId] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const search = useDebouncedValue(searchInput, 300)

  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useTrashedAdmissions({
    search,
    desired_class_id: classId,
    page,
  })

  // Restore is reversible (runs directly); permanent delete confirms first.
  const [forceTarget, setForceTarget] = React.useState<Admission | null>(null)
  const [bulkForceOpen, setBulkForceOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<number>>(new Set())

  const restore = useRestoreAdmission()
  const bulkRestore = useBulkRestoreAdmission()
  const forceDelete = useForceDeleteAdmission()
  const bulkForceDelete = useBulkForceDeleteAdmission()

  const admissions = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters = search.trim().length > 0 || classId != null

  // Selection is page-scoped: a page change or refetch drops stale ids naturally.
  const selectedAdmissions = admissions.filter((a) => selected.has(a.id))
  const selectedCount = selectedAdmissions.length
  const allOnPageSelected =
    admissions.length > 0 && selectedCount === admissions.length

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(admissions.map((a) => a.id)) : new Set())
  }
  function clearFilters() {
    setSearchInput("")
    setClassId(null)
    setPage(1)
  }

  async function restoreOne(admission: Admission) {
    try {
      await restore.mutateAsync(admission.id)
      toastSuccess("Application restored.", { id: "admission-restore" })
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(admission.id)
        return next
      })
    } catch (error) {
      toastError(error, "Couldn't restore the application.", {
        id: "admission-restore",
      })
    }
  }

  async function restoreSelected() {
    const ids = selectedAdmissions.map((a) => a.id)
    if (ids.length === 0) return
    try {
      await bulkRestore.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Application restored."
          : `${ids.length} applications restored.`,
        { id: "admission-bulk-restore" },
      )
      setSelected(new Set())
    } catch (error) {
      toastError(error, "Couldn't restore the applications.", {
        id: "admission-bulk-restore",
      })
    }
  }

  async function confirmForceDelete() {
    if (!forceTarget) return
    try {
      await forceDelete.mutateAsync(forceTarget.id)
      toastSuccess("Application permanently deleted.", {
        id: "admission-force-delete",
      })
      setForceTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the application.", {
        id: "admission-force-delete",
      })
      throw error
    }
  }

  async function confirmBulkForceDelete() {
    const ids = selectedAdmissions.map((a) => a.id)
    if (ids.length === 0) return
    try {
      await bulkForceDelete.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Application permanently deleted."
          : `${ids.length} applications permanently deleted.`,
        { id: "admission-bulk-force-delete" },
      )
      setSelected(new Set())
      setBulkForceOpen(false)
    } catch (error) {
      toastError(error, "Couldn't delete the applications.", {
        id: "admission-bulk-force-delete",
      })
      throw error
    }
  }

  const rowActions = (admission: Admission) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void restoreOne(admission)}
        title="Restore application"
      >
        <RotateCcw className="size-4" aria-hidden />
        <span className="sr-only">
          Restore {admissionApplicantName(admission)}
        </span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setForceTarget(admission)}
        title="Delete permanently"
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="sr-only">
          Permanently delete {admissionApplicantName(admission)}
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
          render={<Link href="/admissions" />}
          className="-ml-2 w-fit text-copy-muted"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to admissions
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Trash
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Deleted applications. Restore them or delete them permanently.
          </p>
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
            placeholder="Search by name, app no, or mobile…"
            aria-label="Search trashed applications"
            className="h-9 pl-8"
          />
        </div>
        <div className="sm:w-44">
          <ClassSelect
            value={classId}
            onValueChange={changeClass}
            placeholder="All classes"
            aria-label="Filter by class"
          />
        </div>
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-subtle px-4 py-2.5">
          <p className="text-sm font-medium text-copy-secondary">
            {selectedCount} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
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
          description="We couldn't load the trash."
          onRetry={() => void refetch()}
        />
      ) : admissions.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title={hasFilters ? "No matching applications" : "Trash is empty"}
          description={
            hasFilters
              ? "No deleted applications match the current filters."
              : "Deleted applications will appear here."
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
                      label="Select all applications on this page"
                    />
                  </TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Application no.</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissions.map((admission) => (
                  <TableRow
                    key={admission.id}
                    data-selected={selected.has(admission.id)}
                  >
                    <TableCell className="w-px">
                      <SelectCheckbox
                        checked={selected.has(admission.id)}
                        onChange={(c) => toggleOne(admission.id, c)}
                        label={`Select ${admissionApplicantName(admission)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <ApplicantIdentity admission={admission} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-copy-secondary">
                      {admission.application_no}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {statusClassName(admission) || EMPTY}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={admission.status}
                        tone={admissionStatusTone(admission.status)}
                        label={admissionStatusLabel(admission.status)}
                      />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {deletedOn(admission)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rowActions(admission)}
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
                unit="application"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {admissions.map((admission) => (
              <li
                key={admission.id}
                className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4"
                data-selected={selected.has(admission.id)}
              >
                <div className="flex items-start gap-2.5">
                  <span className="pt-1">
                    <SelectCheckbox
                      checked={selected.has(admission.id)}
                      onChange={(c) => toggleOne(admission.id, c)}
                      label={`Select ${admissionApplicantName(admission)}`}
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <ApplicantIdentity admission={admission} />
                      <StatusBadge
                        status={admission.status}
                        tone={admissionStatusTone(admission.status)}
                        label={admissionStatusLabel(admission.status)}
                      />
                    </div>
                    <p className="truncate font-mono text-xs text-copy-muted">
                      {admission.application_no}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {[
                        statusClassName(admission),
                        deletedOn(admission) !== EMPTY
                          ? `Deleted ${deletedOn(admission)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                {rowActions(admission)}
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="application"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <DeleteDialog
        open={forceTarget != null}
        onOpenChange={(open) => !open && setForceTarget(null)}
        title="Delete permanently"
        description={
          forceTarget ? (
            <>
              Permanently delete{" "}
              <span className="font-medium">
                {admissionApplicantName(forceTarget)}
              </span>
              &apos;s application? This removes it and its uploaded documents for
              good. This can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        onConfirm={confirmForceDelete}
      />

      <DeleteDialog
        open={bulkForceOpen}
        onOpenChange={setBulkForceOpen}
        title={`Delete ${selectedCount} application${selectedCount === 1 ? "" : "s"} permanently`}
        description={
          <>
            Permanently delete the {selectedCount} selected application
            {selectedCount === 1 ? "" : "s"}? This removes
            {selectedCount === 1 ? " it" : " them"} and any uploaded documents for
            good. This can&apos;t be undone.
          </>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={confirmBulkForceDelete}
      />
    </div>
  )
}

function deletedOn(admission: Admission): string {
  return admission.deleted_at ? formatDate(admission.deleted_at) : EMPTY
}

function ApplicantIdentity({ admission }: { admission: Admission }) {
  const name = admissionApplicantName(admission)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 truncate font-medium text-copy-primary">{name}</p>
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
