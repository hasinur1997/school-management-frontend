"use client"

/**
 * One student's billing, embedded in the student-detail "Billing" tab and the
 * student's own profile fees tab (task F-5.2). Lists every invoice for the
 * student (month, invoice no, paid/partial/unpaid status, amount) as compact
 * rows — the same shape as the main invoices list — each with **View invoice**
 * and **View money receipt** actions that open the single invoice detail
 * (`/invoices/{id}`) or the money-receipt page (`/invoices/{id}/receipt`), where
 * viewing, paying, and printing/downloading happen. Nothing expands inline.
 *
 * The read endpoint depends on the caller: staff (`invoice.view`) read the
 * student via `GET /invoices?student_id=`; a student or linked parent — who hold
 * no `invoice.view` — read via `GET /me/invoices` (own for a student, the linked
 * child for a parent). Money is rendered from the API's decimal strings via
 * `formatMoney` (no float math).
 */

import * as React from "react"
import Link from "next/link"
import { Eye, Plus, Receipt, Wallet } from "lucide-react"

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
import { CardGridSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { usePermission } from "@/hooks/auth/use-permission"
import { useInvoices, useMyInvoices } from "@/hooks/invoices"
import { formatMoney } from "@/lib/format"
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONE,
  invoiceHasReceipt,
  invoiceMonthLabel,
  type Invoice,
} from "@/types/invoice"
import { FEE_COLLECT, INVOICE_MANAGE, INVOICE_VIEW } from "./permissions"
import { InvoiceFormDialog } from "./invoice-form-dialog"
import { CollectPaymentDialog } from "./collect-payment-dialog"

/** Recent years offered in the year filter (current + the four prior). */
function recentYears(): number[] {
  const now = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => now - i)
}

export function StudentInvoicesPanel({
  studentId,
  studentName,
  backHref,
}: {
  /** The viewed student (staff/parent); omitted for the student's own view. */
  studentId?: string
  /** The viewed student's name — presets the create form (staff). */
  studentName?: string
  /** Where the invoice detail / receipt back link returns to. */
  backHref: string
}) {
  const canViewAll = usePermission(INVOICE_VIEW)
  const useStaffPath = canViewAll && !!studentId

  const [year, setYear] = React.useState<number | null>(null)
  const [page, setPage] = React.useState(1)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [collectOpen, setCollectOpen] = React.useState(false)

  function changeYear(value: number | null) {
    setYear(value)
    setPage(1)
  }

  const staff = useInvoices(
    { student_id: studentId, year, page },
    useStaffPath,
  )
  const self = useMyInvoices({ student_id: studentId, year, page }, !useStaffPath)
  const query = useStaffPath ? staff : self

  const { data, isPending, isError, isFetching, refetch } = query
  const invoices = data?.data ?? []
  const meta = data?.meta
  const lastPage = meta?.last_page ?? 1
  const years = React.useMemo(() => recentYears(), [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-copy-muted">
          Invoices and payment history. Open an invoice to view or pay it, or
          view its money receipt.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-32">
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
          {studentId && useStaffPath ? (
            <Can permission={FEE_COLLECT}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCollectOpen(true)}
              >
                <Wallet className="size-4" aria-hidden />
                Collect payment
              </Button>
            </Can>
          ) : null}
          {studentId ? (
            <Can permission={INVOICE_MANAGE}>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                New invoice
              </Button>
            </Can>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <CardGridSkeleton count={4} />
      ) : isError ? (
        <ErrorPanel
          description="We couldn't load these invoices."
          onRetry={() => void refetch()}
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={year != null ? "No invoices for this year" : "No invoices yet"}
          description={
            year != null
              ? "There are no invoices for the selected year."
              : "Invoices appear here once monthly generation has run."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3" aria-busy={isFetching}>
            {invoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                backHref={backHref}
              />
            ))}
          </ul>

          <ListPager
            meta={meta}
            page={page}
            lastPage={lastPage}
            unit="invoice"
            disabled={isFetching}
            onPage={setPage}
          />
        </>
      )}

      {studentId ? (
        <InvoiceFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          presetStudent={{ id: studentId, name: studentName ?? "This student" }}
        />
      ) : null}

      {studentId && useStaffPath ? (
        <CollectPaymentDialog
          studentId={studentId}
          studentName={studentName}
          open={collectOpen}
          onOpenChange={setCollectOpen}
        />
      ) : null}
    </div>
  )
}

/**
 * One invoice as a compact list row — month/invoice no, status, amount — with
 * **View invoice** and (for a settled invoice) **View money receipt** actions
 * that navigate to the standalone single pages. `backHref` is threaded through
 * as `?from=` so those pages' back link returns to this student.
 */
function InvoiceRow({
  invoice,
  backHref,
}: {
  invoice: Invoice
  backHref: string
}) {
  const fromParam = encodeURIComponent(backHref)
  const detailHref = `/invoices/${invoice.id}?from=${fromParam}`
  const receiptHref = `/invoices/${invoice.id}/receipt?from=${fromParam}`

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-copy-primary">
          {invoiceMonthLabel(invoice.month, invoice.year)}
        </p>
        <p className="truncate font-mono text-xs text-copy-muted">
          {invoice.invoice_no ?? ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          status={INVOICE_STATUS_LABELS[invoice.status]}
          tone={INVOICE_STATUS_TONE[invoice.status]}
        />
        <span className="min-w-20 text-right font-medium tabular-nums text-copy-primary">
          {formatMoney(invoice.amount)}
        </span>
        <div className="flex items-center gap-2">
          <Link href={detailHref}>
            <Button variant="outline" size="sm">
              <Eye className="size-4" aria-hidden />
              View invoice
            </Button>
          </Link>
          {invoiceHasReceipt(invoice) ? (
            <Link href={receiptHref}>
              <Button variant="outline" size="sm">
                <Receipt className="size-4" aria-hidden />
                View money receipt
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  )
}
