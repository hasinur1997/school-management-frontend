"use client"

/**
 * Staff payments list (backend 10.6): a paginated, searchable, filterable ledger
 * of every payment recorded in the branch — counter (cash) and online alike.
 * Reads `usePayments` (`GET /payments`, `invoice.view`). Searches by receipt
 * number, invoice number, and student name; filters by status, method, and an
 * inclusive settlement-date range. Each row links to its invoice and, when the
 * payment is settled, to the money receipt. All four states — loading / empty /
 * error / loaded — are present and the layout is responsive (table ≥ md, cards
 * below).
 *
 * Money is rendered from the API's decimal string via `formatMoney` (no float
 * math); the status badge tone follows `ui-context.md`.
 */

import * as React from "react"
import Link from "next/link"
import { CreditCard, Eye, Receipt, Search, X } from "lucide-react"

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
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { usePayments } from "@/hooks/invoices"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate, formatMoney } from "@/lib/format"
import {
  invoiceMonthLabel,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  PAYMENT_STATUSES,
  paymentStudentName,
  type Payment,
  type PaymentMethod,
  type PaymentMethodFilter,
  type PaymentStatus,
  type PaymentStatusFilter,
} from "@/types/invoice"

const EMPTY = "—"

export function PaymentsList() {
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput, 300)
  const [status, setStatus] = React.useState<PaymentStatusFilter>("all")
  const [method, setMethod] = React.useState<PaymentMethodFilter>("all")
  const [from, setFrom] = React.useState<string | null>(null)
  const [to, setTo] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  // Changing a filter (or the search) resets to the first page.
  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeStatus(value: PaymentStatusFilter) {
    setStatus(value)
    setPage(1)
  }
  function changeMethod(value: PaymentMethodFilter) {
    setMethod(value)
    setPage(1)
  }
  function changeFrom(value: string | null) {
    setFrom(value)
    setPage(1)
  }
  function changeTo(value: string | null) {
    setTo(value)
    setPage(1)
  }

  const { data, isPending, isError, isFetching, refetch } = usePayments({
    search,
    status,
    method,
    from,
    to,
    page,
  })

  const payments = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const hasFilters =
    search.trim().length > 0 ||
    status !== "all" ||
    method !== "all" ||
    from != null ||
    to != null

  function clearFilters() {
    setSearchInput("")
    setStatus("all")
    setMethod("all")
    setFrom(null)
    setTo(null)
    setPage(1)
  }

  const rowActions = (payment: Payment) => {
    const invoiceId = payment.invoice?.id
    if (!invoiceId) return null
    return (
      <div className="flex items-center justify-end gap-1">
        <Link href={`/invoices/${invoiceId}`} title="View invoice">
          <Button variant="ghost" size="sm">
            <Eye className="size-4" aria-hidden />
            <span className="hidden sm:inline">Invoice</span>
            <span className="sr-only">
              View invoice {payment.invoice?.invoice_no ?? ""}
            </span>
          </Button>
        </Link>
        {payment.status === "paid" ? (
          <Link
            href={`/invoices/${invoiceId}/receipt`}
            title="View money receipt"
          >
            <Button variant="ghost" size="sm">
              <Receipt className="size-4" aria-hidden />
              <span className="hidden sm:inline">Receipt</span>
              <span className="sr-only">
                View money receipt {payment.receipt_no ?? ""}
              </span>
            </Button>
          </Link>
        ) : null}
      </div>
    )
  }

  const period = (payment: Payment) =>
    payment.invoice
      ? invoiceMonthLabel(payment.invoice.month, payment.invoice.year)
      : EMPTY

  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          Payments
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Every counter and online payment recorded against invoices.
        </p>
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
            placeholder="Search by receipt no, invoice no, or student name…"
            aria-label="Search payments"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-40">
            <Select
              value={status}
              onValueChange={(next) =>
                changeStatus((next as PaymentStatusFilter) ?? "all")
              }
            >
              <SelectTrigger aria-label="Filter by status" className="w-full">
                <SelectValue>
                  {(v: PaymentStatusFilter) =>
                    v === "all"
                      ? "All statuses"
                      : PAYMENT_STATUS_LABELS[v as PaymentStatus]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PAYMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:w-40">
            <Select
              value={method}
              onValueChange={(next) =>
                changeMethod((next as PaymentMethodFilter) ?? "all")
              }
            >
              <SelectTrigger aria-label="Filter by method" className="w-full">
                <SelectValue>
                  {(v: PaymentMethodFilter) =>
                    v === "all"
                      ? "All methods"
                      : PAYMENT_METHOD_LABELS[v as PaymentMethod]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from ?? ""}
              onChange={(e) => changeFrom(e.target.value || null)}
              aria-label="Paid from date"
              className="sm:w-40"
            />
            <span className="text-sm text-copy-muted" aria-hidden>
              –
            </span>
            <Input
              type="date"
              value={to ?? ""}
              onChange={(e) => changeTo(e.target.value || null)}
              aria-label="Paid to date"
              className="sm:w-40"
            />
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
        <TableSkeleton rows={8} columns={7} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load the payments."
          onRetry={() => void refetch()}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={hasFilters ? "No matching payments" : "No payments yet"}
          description={
            hasFilters
              ? "No payments match the current search or filters."
              : "Payments recorded against invoices will appear here."
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
                  <TableHead>Receipt</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs text-copy-secondary">
                      {payment.receipt_no ?? EMPTY}
                    </TableCell>
                    <TableCell className="font-medium text-copy-primary">
                      {payment.invoice?.id ? (
                        <Link
                          href={`/invoices/${payment.invoice.id}`}
                          className="hover:underline focus-visible:underline focus-visible:outline-none"
                        >
                          {paymentStudentName(payment)}
                        </Link>
                      ) : (
                        paymentStudentName(payment)
                      )}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      <span className="font-mono text-xs">
                        {payment.invoice?.invoice_no ?? EMPTY}
                      </span>
                      <span className="block text-xs text-copy-muted">
                        {period(payment)}
                      </span>
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {payment.paid_at ? formatDate(payment.paid_at) : EMPTY}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          PAYMENT_STATUS_LABELS[payment.status] ??
                          payment.status
                        }
                        tone={PAYMENT_STATUS_TONE[payment.status]}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-copy-primary">
                      {formatMoney(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rowActions(payment)}
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
                unit="payment"
                disabled={isFetching}
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden" aria-busy={isFetching}>
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-copy-primary">
                      {paymentStudentName(payment)}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {payment.receipt_no ?? EMPTY}
                      {payment.invoice?.invoice_no
                        ? ` · ${payment.invoice.invoice_no}`
                        : ""}
                    </p>
                    <p className="truncate text-xs text-copy-muted">
                      {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                      {payment.paid_at ? ` · ${formatDate(payment.paid_at)}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      PAYMENT_STATUS_LABELS[payment.status] ?? payment.status
                    }
                    tone={PAYMENT_STATUS_TONE[payment.status]}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium tabular-nums text-copy-primary">
                    {formatMoney(payment.amount)}
                  </p>
                  {rowActions(payment)}
                </div>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={page}
              lastPage={lastPage}
              unit="payment"
              disabled={isFetching}
              onPage={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
