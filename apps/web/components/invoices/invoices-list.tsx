"use client"

/**
 * Staff invoices list (task F-5.2, backend 10.2): paginated, searchable,
 * filterable table with a mobile card list. Reads `useInvoices`
 * (`GET /invoices`, `invoice.view`). Searches by invoice number and the
 * student's name / email / phone / address; filters by class (via the shared
 * academic selector), status, month, and year. There is no session filter — the
 * backend narrows by class/month/year/status only. Each row opens the invoice
 * detail; with `fee.manage`, invoices can be created, edited, and deleted. All
 * four states — loading / empty / error / loaded — are present and the layout is
 * responsive (table ≥ md, cards below).
 *
 * Money is rendered from the API's decimal string via `formatMoney` (no float
 * math); the status badge tone follows `ui-context.md`.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Receipt, Search, Trash2, X } from "lucide-react"

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
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { ClassSelect } from "@/components/academic/class-select"
import { DeleteDialog } from "@/components/academic/management/delete-dialog"
import { useInvoices, useDeleteInvoice } from "@/hooks/invoices"
import { usePermission } from "@/hooks/auth/use-permission"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { toastError, toastSuccess } from "@/lib/toast"
import { formatMoney } from "@/lib/format"
import {
  INVOICE_MONTHS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONE,
  INVOICE_STATUSES,
  invoiceMonthLabel,
  invoiceStudentName,
  type Invoice,
  type InvoiceStatus,
  type InvoiceStatusFilter,
} from "@/types/invoice"
import { INVOICE_MANAGE } from "./permissions"
import { InvoiceFormDialog } from "./invoice-form-dialog"

const EMPTY = "—"

/** Recent years offered in the year filter (current + the four prior). */
function recentYears(): number[] {
  const now = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => now - i)
}

export function InvoicesList() {
  const router = useRouter()
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput, 300)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<InvoiceStatusFilter>("all")
  const [month, setMonth] = React.useState<number | null>(null)
  const [year, setYear] = React.useState<number | null>(null)
  const [page, setPage] = React.useState(1)

  // Changing a filter (or the search) resets to the first page.
  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassId(value)
    setPage(1)
  }
  function changeStatus(value: InvoiceStatusFilter) {
    setStatus(value)
    setPage(1)
  }
  function changeMonth(value: number | null) {
    setMonth(value)
    setPage(1)
  }
  function changeYear(value: number | null) {
    setYear(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = useInvoices({
    search,
    class_id: classId,
    status,
    month,
    year,
    page,
  })

  const canManage = usePermission(INVOICE_MANAGE)
  const deleteInvoice = useDeleteInvoice()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Invoice | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<Invoice | null>(null)

  const invoices = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    search.trim().length > 0 ||
    classId != null ||
    status !== "all" ||
    month != null ||
    year != null

  const years = React.useMemo(() => recentYears(), [])

  function clearFilters() {
    setSearchInput("")
    setClassId(null)
    setStatus("all")
    setMonth(null)
    setYear(null)
    setPage(1)
  }

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(invoice: Invoice) {
    setEditing(invoice)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteInvoice.mutateAsync(deleteTarget.id)
      toastSuccess("Invoice deleted.", { id: "invoice-delete" })
      setDeleteTarget(null)
    } catch (error) {
      // A `422` here means a payment has been recorded against the invoice; the
      // API message is surfaced and the dialog stays open so the user can back out.
      toastError(error, "Couldn't delete the invoice.", { id: "invoice-delete" })
      throw error
    }
  }

  const createButton = (
    <Can permission={INVOICE_MANAGE}>
      <Button onClick={openCreate}>
        <Plus className="size-4" aria-hidden />
        New invoice
      </Button>
    </Can>
  )

  const rowActions = (invoice: Invoice) => (
    <Can permission={INVOICE_MANAGE}>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            openEdit(invoice)
          }}
          title="Edit invoice"
        >
          <Pencil className="size-4" aria-hidden />
          <span className="sr-only">Edit invoice {invoice.invoice_no ?? ""}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteTarget(invoice)
          }}
          title="Delete invoice"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="sr-only">Delete invoice {invoice.invoice_no ?? ""}</span>
        </Button>
      </div>
    </Can>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Invoices
          </h1>
          <p className="truncate text-sm text-copy-muted">
            Monthly fee invoices with paid, partial, and unpaid status.
          </p>
        </div>
        {createButton}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by invoice no, student name, email, phone, or address…"
            aria-label="Search invoices"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="sm:w-48">
          <ClassSelect
            value={classId}
            onValueChange={changeClass}
            aria-label="Filter by class"
          />
        </div>
        <div className="sm:w-40">
          <Select
            value={status}
            onValueChange={(next) =>
              changeStatus((next as InvoiceStatusFilter) ?? "all")
            }
          >
            <SelectTrigger aria-label="Filter by status" className="w-full">
              <SelectValue>
                {(v: InvoiceStatusFilter) =>
                  v === "all"
                    ? "All statuses"
                    : INVOICE_STATUS_LABELS[v as InvoiceStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INVOICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {INVOICE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-40">
          <Select
            value={month == null ? "all" : String(month)}
            onValueChange={(next) =>
              changeMonth(next === "all" ? null : Number(next))
            }
          >
            <SelectTrigger aria-label="Filter by month" className="w-full">
              <SelectValue>
                {(v: string) =>
                  v === "all"
                    ? "All months"
                    : (INVOICE_MONTHS[Number(v) - 1]?.label ?? "All months")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {INVOICE_MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-32">
          <Select
            value={year == null ? "all" : String(year)}
            onValueChange={(next) =>
              changeYear(next === "all" ? null : Number(next))
            }
          >
            <SelectTrigger aria-label="Filter by year" className="w-full">
              <SelectValue>
                {(v: string) => (v === "all" ? "All years" : v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
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
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={5} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the invoices."
          onRetry={() => void refetch()}
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "No matching invoices" : "No invoices yet"}
          description={
            hasFilters
              ? "No invoices match the current search or filters."
              : "Create an invoice, or run monthly generation to raise them in bulk."
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
                  <TableHead>Student</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canManage ? (
                    <TableHead className="w-px text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <TableCell className="font-medium text-copy-primary">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="hover:underline focus-visible:underline focus-visible:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {invoiceStudentName(invoice)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-copy-secondary">
                      {invoice.invoice_no ?? EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {invoiceMonthLabel(invoice.month, invoice.year)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={INVOICE_STATUS_LABELS[invoice.status]}
                        tone={INVOICE_STATUS_TONE[invoice.status]}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-copy-primary">
                      {formatMoney(invoice.amount)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {rowActions(invoice)}
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
                unit="invoice"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-copy-primary">
                      {invoiceStudentName(invoice)}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {invoiceMonthLabel(invoice.month, invoice.year)}
                      {invoice.invoice_no ? ` · ${invoice.invoice_no}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={INVOICE_STATUS_LABELS[invoice.status]}
                    tone={INVOICE_STATUS_TONE[invoice.status]}
                  />
                </Link>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium tabular-nums text-copy-primary">
                    {formatMoney(invoice.amount)}
                  </p>
                  {rowActions(invoice)}
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="invoice"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={editing}
      />

      <DeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete invoice"
        description={
          deleteTarget ? (
            <>
              Delete invoice{" "}
              <span className="font-medium">
                {deleteTarget.invoice_no ?? invoiceStudentName(deleteTarget)}
              </span>
              ? An invoice with a recorded payment can&apos;t be deleted. This
              can&apos;t be undone.
            </>
          ) : null
        }
        onConfirm={confirmDelete}
      />
    </div>
  )
}
