"use client"

/**
 * Payment history for one invoice (task F-5.2). Lists the payments recorded
 * against the invoice (newest first), each with its receipt number, amount,
 * method, status, and settlement time. An invoice with no payments shows an
 * empty state. The receipt download and the record-payment action are wired in
 * task 5.3 — this only reflects the API's payment records.
 *
 * Money is rendered from the API's decimal string via `formatMoney` (no float
 * math); status tone follows `ui-context.md`.
 */

import { CreditCard } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  type Payment,
} from "@/types/invoice"

export function InvoicePayments({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No payments yet"
        description="Payments recorded against this invoice will appear here."
        className="border-0 bg-transparent py-6"
      />
    )
  }

  return (
    <ul className="flex flex-col">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="flex items-start justify-between gap-4 border-t border-surface-border-subtle py-[13px] first:border-t-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-copy-primary">
              {formatMoney(payment.amount)}
            </p>
            <p className="truncate text-xs text-copy-muted">
              {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
              {payment.receipt_no ? ` · ${payment.receipt_no}` : ""}
              {payment.paid_at ? ` · ${formatDate(payment.paid_at)}` : ""}
            </p>
          </div>
          <StatusBadge
            status={PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
            tone={PAYMENT_STATUS_TONE[payment.status]}
          />
        </li>
      ))}
    </ul>
  )
}
