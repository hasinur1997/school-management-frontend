"use client"

/**
 * One student's billing, embedded in the student-detail "Billing" tab and the
 * student's own profile fees tab (task F-5.2). Lists every invoice for the
 * student (month, amount, paid/partial/unpaid status); each row expands inline
 * to reveal that invoice as the printable invoice document (`InvoicePaper`, the
 * same design as the standalone `/invoices/{id}` detail), so all of a student's
 * invoices and payments live on the one page. A row also links out to the full
 * invoice detail, where payment happens (wired in 5.3).
 *
 * The read endpoint depends on the caller: staff (`invoice.view`) read the
 * student via `GET /invoices?student_id=`; a student or linked parent — who hold
 * no `invoice.view` — read via `GET /me/invoices` (own for a student, the linked
 * child for a parent). Each invoice's payments are loaded on expand via
 * `GET /invoices/{id}` (`useInvoice`), which the API authorizes per-record.
 * Money is rendered from the API's decimal strings via `formatMoney` (no float
 * math).
 */

import * as React from "react"
import Link from "next/link"
import { ChevronDown, ExternalLink, Plus, Receipt } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { CardGridSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { usePermission } from "@/hooks/auth/use-permission"
import { useInvoice, useInvoices, useMyInvoices } from "@/hooks/invoices"
import { formatMoney } from "@/lib/format"
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONE,
  invoiceMonthLabel,
  type Invoice,
} from "@/types/invoice"
import { INVOICE_MANAGE, INVOICE_VIEW } from "./permissions"
import { InvoicePaper } from "./invoice-paper"
import { InvoiceFormDialog } from "./invoice-form-dialog"

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
  /** Where the invoice detail's back link returns to. */
  backHref: string
}) {
  const canViewAll = usePermission(INVOICE_VIEW)
  const useStaffPath = canViewAll && !!studentId

  const [year, setYear] = React.useState<number | null>(null)
  const [page, setPage] = React.useState(1)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  function changeYear(value: number | null) {
    setYear(value)
    setPage(1)
    setExpandedId(null)
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

  function toggle(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-copy-muted">
          Invoices and payment history. Expand an invoice to see its payments, or
          open it to pay.
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
                expanded={expandedId === invoice.id}
                onToggle={() => toggle(invoice.id)}
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
    </div>
  )
}

/** A single invoice: a summary header that toggles an inline payment history. */
function InvoiceRow({
  invoice,
  expanded,
  onToggle,
  backHref,
}: {
  invoice: Invoice
  expanded: boolean
  onToggle: () => void
  backHref: string
}) {
  return (
    <li className="overflow-hidden rounded-xl border border-surface-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-subtle"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-copy-primary">
            {invoiceMonthLabel(invoice.month, invoice.year)}
          </p>
          <p className="truncate text-xs text-copy-muted">
            {invoice.invoice_no ?? ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge
            status={INVOICE_STATUS_LABELS[invoice.status]}
            tone={INVOICE_STATUS_TONE[invoice.status]}
          />
          <span className="font-medium tabular-nums text-copy-primary">
            {formatMoney(invoice.amount)}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-copy-muted transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-surface-border-subtle p-4">
          <InvoiceExpanded invoiceId={invoice.id} backHref={backHref} />
        </div>
      ) : null}
    </li>
  )
}

/**
 * The expanded body of an invoice row: the invoice rendered as the printable
 * paper document (`InvoicePaper`), fetched on demand (`useInvoice` →
 * `GET /invoices/{id}`) so the paper carries the same payment history the
 * standalone detail shows, plus a link to that full detail where the
 * pay/receipt actions live (5.3).
 */
function InvoiceExpanded({
  invoiceId,
  backHref,
}: {
  invoiceId: string
  backHref: string
}) {
  const { data: invoice, isPending, isError, refetch } = useInvoice(invoiceId)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorPanel
        description="We couldn't load this invoice's payments."
        onRetry={() => void refetch()}
        className="border-0 bg-transparent p-0"
      />
    )
  }

  const detailHref = `/invoices/${invoice.id}?from=${encodeURIComponent(backHref)}`

  return (
    <div className="flex flex-col gap-4">
      <InvoicePaper invoice={invoice} />

      <Link
        href={detailHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <ExternalLink className="size-4" aria-hidden />
        Open invoice
      </Link>
    </div>
  )
}
