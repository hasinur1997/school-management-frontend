"use client"

/**
 * Admissions review queue (task 2.6): paginated, searchable, status- and
 * class-filterable table with a mobile card list, plus the approve and reject
 * actions. Reads `useAdmissions`; approve/reject invalidate the cache so a
 * processed application leaves the pending queue.
 *
 * The queue lists every application by default (`all`) and the user can narrow to
 * Pending / Approved / Rejected. Implements all four states — loading / empty / error / loaded —
 * and is responsive (table ≥ md, cards below). Manage actions are gated by
 * `admissions.manage` and only shown while an application is still pending.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Check,
  Eye,
  Inbox,
  MoreHorizontal,
  Search,
  Trash2,
  X,
} from "lucide-react"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { SelectCheckbox } from "@/components/select-checkbox"
import { ClassSelect } from "@/components/academic"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { usePermission } from "@/hooks/auth/use-permission"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useAdmissions,
  useDeleteAdmission,
  useBulkDeleteAdmission,
} from "@/hooks/admissions"
import {
  admissionApplicantName,
  isPendingAdmission,
  statusClassName,
  type Admission,
  type AdmissionStatusFilter,
} from "@/types/admission"
import { ADMISSION_MANAGE } from "./permissions"
import { AdmissionStatusFilter as StatusFilterSelect } from "./admission-status-filter"
import { admissionStatusLabel, admissionStatusTone } from "./admission-tone"
import { ApproveDialog } from "./approve-dialog"
import { RejectDialog } from "./reject-dialog"

const EMPTY = "—"

export function AdmissionsList() {
  const router = useRouter()

  const [searchInput, setSearchInput] = React.useState("")
  const [status, setStatus] = React.useState<AdmissionStatusFilter>("all")
  const [classId, setClassId] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const search = useDebouncedValue(searchInput, 300)

  // Changing a filter resets to the first page (handled in the change handlers
  // rather than an effect — there's no external system to sync).
  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeStatus(value: AdmissionStatusFilter) {
    setStatus(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useAdmissions({
    search,
    status,
    desired_class_id: classId,
    page,
  })

  const [approveTarget, setApproveTarget] = React.useState<Admission | null>(
    null
  )
  const [rejectTarget, setRejectTarget] = React.useState<Admission | null>(null)

  // Delete (soft) state: a single target, or the bulk selection.
  const [deleteTarget, setDeleteTarget] = React.useState<Admission | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<number>>(new Set())

  const canManage = usePermission(ADMISSION_MANAGE)
  const deleteAdmission = useDeleteAdmission()
  const bulkDeleteAdmission = useBulkDeleteAdmission()

  const admissions = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1

  // Selection is page-scoped: only ids present on the current page count, so a
  // page change or refetch naturally drops stale ids without an effect.
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

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteAdmission.mutateAsync(deleteTarget.id)
      toastSuccess("Application moved to trash.", { id: "admission-delete" })
      setDeleteTarget(null)
    } catch (error) {
      toastError(error, "Couldn't delete the application.", {
        id: "admission-delete",
      })
      throw error
    }
  }

  async function confirmBulkDelete() {
    const ids = selectedAdmissions.map((a) => a.id)
    if (ids.length === 0) return
    try {
      await bulkDeleteAdmission.mutateAsync(ids)
      toastSuccess(
        ids.length === 1
          ? "Application moved to trash."
          : `${ids.length} applications moved to trash.`,
        { id: "admission-bulk-delete" }
      )
      setSelected(new Set())
      setBulkOpen(false)
    } catch (error) {
      toastError(error, "Couldn't delete the applications.", {
        id: "admission-bulk-delete",
      })
      throw error
    }
  }
  // The queue defaults to listing everything (`all`); any of status / search /
  // class narrows it, which drives the empty-state copy and the Clear button.
  const hasExtraFilters =
    status !== "all" || search.trim().length > 0 || classId != null

  function clearFilters() {
    setSearchInput("")
    setStatus("all")
    setClassId(null)
    setPage(1)
  }

  const rowActions = (admission: Admission) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${admissionApplicantName(admission)}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push(`/admissions/${admission.id}`)}
        >
          <Eye className="size-4" aria-hidden />
          View details
        </DropdownMenuItem>
        {canManage ? (
          <>
            {isPendingAdmission(admission.status) ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setApproveTarget(admission)}>
                  <Check className="size-4" aria-hidden />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRejectTarget(admission)}>
                  <X className="size-4" aria-hidden />
                  Reject
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteTarget(admission)}
            >
              <Trash2 className="size-4" aria-hidden />
              Move to trash
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Admissions
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Review applications and approve or reject them.
          </p>
        </div>
        <Can permission={ADMISSION_MANAGE}>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/admissions/trash" />}
          >
            <Trash2 className="size-4" aria-hidden />
            Trash
          </Button>
        </Can>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, app no, or mobile…"
            aria-label="Search applications"
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
        <div className="sm:w-44">
          <StatusFilterSelect value={status} onValueChange={changeStatus} />
        </div>
        {hasExtraFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {canManage && selectedCount > 0 ? (
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
              onClick={() => setBulkOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <TableSkeleton rows={8} columns={canManage ? 7 : 6} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the applications."
          onRetry={() => void refetch()}
        />
      ) : admissions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            hasExtraFilters ? "No matching applications" : "No applications"
          }
          description={
            hasExtraFilters
              ? "No applications match the current filters."
              : "There are no applications yet."
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
                  {canManage ? (
                    <TableHead className="w-px">
                      <SelectCheckbox
                        checked={allOnPageSelected}
                        indeterminate={selectedCount > 0}
                        onChange={toggleAll}
                        label="Select all applications on this page"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Applicant</TableHead>
                  <TableHead>Application no.</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissions.map((admission) => (
                  <TableRow
                    key={admission.id}
                    className="cursor-pointer"
                    data-selected={selected.has(admission.id)}
                    onClick={() => router.push(`/admissions/${admission.id}`)}
                  >
                    {canManage ? (
                      <TableCell
                        className="w-px"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectCheckbox
                          checked={selected.has(admission.id)}
                          onChange={(c) => toggleOne(admission.id, c)}
                          label={`Select ${admissionApplicantName(admission)}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <ApplicantIdentity admission={admission} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-copy-secondary">
                      {admission.application_no}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {statusClassName(admission) || EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {admission.father_mobile || EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {submittedOn(admission)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={admission.status}
                        tone={admissionStatusTone(admission.status)}
                        label={admissionStatusLabel(admission.status)}
                      />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                  {canManage ? (
                    <span className="pt-1">
                      <SelectCheckbox
                        checked={selected.has(admission.id)}
                        onChange={(c) => toggleOne(admission.id, c)}
                        label={`Select ${admissionApplicantName(admission)}`}
                      />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col gap-2 text-left"
                    onClick={() => router.push(`/admissions/${admission.id}`)}
                  >
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
                        admission.father_mobile,
                        submittedOn(admission) !== EMPTY
                          ? submittedOn(admission)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
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

      <ApproveDialog
        open={approveTarget != null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        admission={approveTarget}
      />
      <RejectDialog
        open={rejectTarget != null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        admission={rejectTarget}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Move application to trash"
        description={
          deleteTarget ? (
            <>
              Move{" "}
              <span className="font-medium">
                {admissionApplicantName(deleteTarget)}
              </span>
              &apos;s application to the trash? You can restore it later from
              the trash.
            </>
          ) : null
        }
        confirmLabel="Move to trash"
        onConfirm={confirmDelete}
      />

      <DeleteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={`Move ${selectedCount} application${selectedCount === 1 ? "" : "s"} to trash`}
        description={
          <>
            Move the {selectedCount} selected application
            {selectedCount === 1 ? "" : "s"} to the trash? You can restore
            {selectedCount === 1 ? " it" : " them"} later from the trash.
          </>
        }
        confirmLabel={`Move ${selectedCount} to trash`}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

function submittedOn(admission: Admission): string {
  return admission.submitted_at ? formatDate(admission.submitted_at) : EMPTY
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
