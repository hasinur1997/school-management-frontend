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
import { useRouter } from "next/navigation"
import { Check, Inbox, Search, X } from "lucide-react"

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
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { ClassSelect } from "@/components/academic"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/format"
import { useAdmissions } from "@/hooks/admissions"
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
  const [classId, setClassId] = React.useState<number | null>(null)
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
  function changeClass(value: number | null) {
    setClassId(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useAdmissions({
    search,
    status,
    desired_class_id: classId,
    page,
  })

  const [approveTarget, setApproveTarget] = React.useState<Admission | null>(null)
  const [rejectTarget, setRejectTarget] = React.useState<Admission | null>(null)

  const admissions = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
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

  const rowActions = (admission: Admission) =>
    isPendingAdmission(admission.status) ? (
      <Can permission={ADMISSION_MANAGE}>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-1.5 px-3 text-[13px] font-semibold"
            onClick={() => setRejectTarget(admission)}
          >
            <X className="size-3.75" aria-hidden />
            Reject
          </Button>
          <Button
            size="sm"
            className="h-8.5 gap-1.5 px-3.5 text-[13px] font-semibold"
            onClick={() => setApproveTarget(admission)}
          >
            <Check className="size-3.75" aria-hidden />
            Approve
          </Button>
        </div>
      </Can>
    ) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          Admissions
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Review applications and approve or reject them.
        </p>
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

      {isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the applications."
          onRetry={() => void refetch()}
        />
      ) : admissions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasExtraFilters ? "No matching applications" : "No applications"}
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
                    onClick={() => router.push(`/admissions/${admission.id}`)}
                  >
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
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-col gap-2 text-left"
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
                      submittedOn(admission) !== EMPTY ? submittedOn(admission) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
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
