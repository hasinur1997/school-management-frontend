"use client"

/**
 * Fee-structures list (task F-5.1, backend 10.1): paginated, filterable table
 * with a mobile card list and a create/edit dialog. Reads `useFeeStructures`;
 * writes invalidate the cache. Filters by session, class, and fee type via the
 * shared academic selectors. All four states — loading / empty / error / loaded
 * — are present and the layout is responsive (table ≥ md, cards below).
 *
 * Money is rendered from the API's decimal string via `formatMoney` (no float
 * math). Deleting a fee that has been used in invoices is rejected by the API
 * (`422`); the message is surfaced on the still-open confirm dialog so the user
 * can back out.
 */

import * as React from "react"
import { Pencil, Plus, Receipt, Trash2, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { SessionSelect } from "@/components/academic/session-select"
import { ClassSelect } from "@/components/academic/class-select"
import { useSessions, useClasses } from "@/hooks/academic"
import { useFeeStructures, useDeleteFeeStructure } from "@/hooks/fees"
import { usePermission } from "@/hooks/auth/use-permission"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatMoney } from "@/lib/format"
import {
  FEE_TYPE_LABELS,
  FEE_TYPE_TONE,
  FEE_TYPES,
  type FeeStructure,
  type FeeType,
  type FeeTypeFilter,
} from "@/types/fee"
import { FEE_MANAGE } from "./permissions"
import { FeeStructureFormDialog } from "./fee-structure-form-dialog"

const EMPTY = "—"

export function FeeStructuresList() {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [feeType, setFeeType] = React.useState<FeeTypeFilter>("all")
  const [page, setPage] = React.useState(1)

  // Changing a filter resets to the first page.
  function changeSession(value: string | null) {
    setSessionId(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setPage(1)
  }
  function changeFeeType(value: FeeTypeFilter) {
    setFeeType(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useFeeStructures({
    session_id: sessionId,
    class_id: classId,
    fee_type: feeType,
    page,
  })

  // The resource eager-loads session/class, but fall back to the cached selector
  // data if a row only carries the id hashes.
  const { data: sessions } = useSessions()
  const { data: classes } = useClasses()
  const sessionName = React.useMemo(() => {
    const map = new Map((sessions ?? []).map((s) => [s.id, s.name]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? null : null)
  }, [sessions])
  const className = React.useMemo(() => {
    const map = new Map((classes ?? []).map((c) => [c.id, c.name]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? null : null)
  }, [classes])

  function sessionLabel(fee: FeeStructure): string {
    return fee.session?.name ?? sessionName(fee.session_id) ?? EMPTY
  }
  function classLabel(fee: FeeStructure): string {
    return fee.class?.name ?? className(fee.class_id) ?? EMPTY
  }

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FeeStructure | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<FeeStructure | null>(
    null,
  )

  const canManage = usePermission(FEE_MANAGE)
  const deleteFee = useDeleteFeeStructure()

  const fees = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    sessionId != null || classId != null || feeType !== "all"

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteFee.mutateAsync(deleteTarget.id)
      toastSuccess("Fee deleted.", { id: "fee-delete" })
      setDeleteTarget(null)
    } catch (error) {
      // A `422` here means the fee has been used in invoices (FK RESTRICT); the
      // API message is surfaced and the dialog stays open so the user can back out.
      toastError(error, "Couldn't delete the fee.", { id: "fee-delete" })
      throw error
    }
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(fee: FeeStructure) {
    setEditing(fee)
    setFormOpen(true)
  }
  function clearFilters() {
    setSessionId(null)
    setClassId(null)
    setFeeType("all")
    setPage(1)
  }

  const createButton = (
    <Can permission={FEE_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New fee
      </Button>
    </Can>
  )

  const rowActions = (fee: FeeStructure) => (
    <Can permission={FEE_MANAGE}>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(fee)}
          title="Edit fee"
        >
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only">Edit {fee.name}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(fee)}
          title="Delete fee"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="sr-only">Delete {fee.name}</span>
        </Button>
      </div>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Fee structures
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Named fees defined per class and session.
          </p>
        </div>
        {createButton}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="sm:w-48">
          <SessionSelect
            value={sessionId}
            onValueChange={changeSession}
            aria-label="Filter by session"
          />
        </div>
        <div className="sm:w-48">
          <ClassSelect
            value={classId}
            onValueChange={changeClass}
            aria-label="Filter by class"
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={feeType}
            onValueChange={(next) =>
              changeFeeType((next as FeeTypeFilter) ?? "all")
            }
          >
            <SelectTrigger aria-label="Filter by fee type" className="w-full">
              <SelectValue>
                {(v: FeeTypeFilter) =>
                  v === "all" ? "All types" : FEE_TYPE_LABELS[v as FeeType]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {FEE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {FEE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={canManage ? 6 : 5} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the fee structures."
          onRetry={() => void refetch()}
        />
      ) : fees.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "No matching fees" : "No fees yet"}
          description={
            hasFilters
              ? "No fees match the current filters."
              : "Create a fee for a class to get started."
          }
          action={hasFilters ? undefined : createButton}
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
                  <TableHead>Fee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canManage ? (
                    <TableHead className="w-px text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium text-copy-primary">
                      <span className="block">{fee.name}</span>
                      {fee.description ? (
                        <span className="block max-w-xs truncate text-xs font-normal text-copy-muted">
                          {fee.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={FEE_TYPE_LABELS[fee.fee_type] ?? fee.fee_type}
                        tone={FEE_TYPE_TONE[fee.fee_type]}
                      />
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {classLabel(fee)}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {sessionLabel(fee)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-copy-primary">
                      {formatMoney(fee.amount)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {rowActions(fee)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={page}
                lastPage={lastPage}
                unit="fee"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {fees.map((fee) => (
              <li
                key={fee.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-copy-primary">
                      {fee.name}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {[classLabel(fee), sessionLabel(fee)]
                        .filter((v) => v && v !== EMPTY)
                        .join(" · ") || EMPTY}
                    </p>
                  </div>
                  <StatusBadge
                    status={FEE_TYPE_LABELS[fee.fee_type] ?? fee.fee_type}
                    tone={FEE_TYPE_TONE[fee.fee_type]}
                  />
                </div>
                {fee.description ? (
                  <p className="text-sm text-copy-secondary">
                    {fee.description}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium tabular-nums text-copy-primary">
                    {formatMoney(fee.amount)}
                  </p>
                  {rowActions(fee)}
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="fee"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <FeeStructureFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        fee={editing}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete fee"
        description={
          deleteTarget ? (
            <>
              Delete <span className="font-medium">{deleteTarget.name}</span>?
              A fee that has already been used in invoices can&apos;t be deleted.
              This can&apos;t be undone.
            </>
          ) : null
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}
