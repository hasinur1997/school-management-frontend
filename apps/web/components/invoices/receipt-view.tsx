"use client"

/**
 * Money-receipt view (task F-5.3). The single page reached from an invoice's
 * "View money receipt" action: it renders the invoice's **combined** receipt —
 * one `ReceiptPaper` summing every settled payment (`buildCombinedReceipt`) —
 * with print-hidden **Print** and **Download** actions that generate the PDF
 * client-side (`receipt-document`). The receipt is no longer streamed by the
 * backend.
 *
 * Like the invoice detail, the route carries no permission middleware: the API
 * authorizes `GET /invoices/{id}` per-record and hides a denial as `404`. An
 * invoice with no settled payment shows a "no receipt yet" empty state.
 */

import * as React from "react"
import Link from "next/link"
import { Download, Printer, Receipt } from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { DetailBackLink, DetailLayout } from "@/components/detail/detail-ui"
import { useInvoice } from "@/hooks/invoices"
import { isNotFoundError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { buildCombinedReceipt } from "@/types/invoice"
import { ReceiptPaper } from "./receipt-paper"
import {
  downloadReceiptPdf,
  printReceiptPdf,
  type ReceiptDocData,
} from "./receipt-document"

export function ReceiptView({
  id,
  backHref = "/invoices",
  backLabel = "Back to invoice",
}: {
  id: string
  backHref?: string
  backLabel?: string
}) {
  const { data: invoice, isPending, isError, error, refetch } = useInvoice(id)
  const [busy, setBusy] = React.useState<"download" | "print" | null>(null)

  if (isPending) {
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <DetailSkeleton />
      </DetailLayout>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <DetailLayout>
          <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
          <EmptyState
            icon={Receipt}
            title="Invoice not found"
            description="This invoice doesn't exist, isn't in your branch, or you don't have access."
            action={
              <Link href={backHref}>
                <Button>{backLabel}</Button>
              </Link>
            }
          />
        </DetailLayout>
      )
    }
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <ErrorPanel
          description="We couldn't load this receipt."
          onRetry={() => void refetch()}
        />
      </DetailLayout>
    )
  }

  const combined = buildCombinedReceipt(invoice)

  // No settled payment → no receipt to show.
  if (!combined) {
    return (
      <DetailLayout>
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <EmptyState
          icon={Receipt}
          title="No receipt yet"
          description="This invoice has no settled payment, so there's nothing to receipt. A money receipt appears here once a payment is recorded."
          action={
            <Link href={`/invoices/${invoice.id}`}>
              <Button variant="outline">View invoice</Button>
            </Link>
          }
        />
      </DetailLayout>
    )
  }

  const docData: ReceiptDocData = {
    invoice,
    payment: combined.payment,
    methodLabel: combined.methodLabel,
    fileName: `money-receipt-${invoice.invoice_no ?? invoice.id}`,
  }

  async function handleDownload() {
    if (busy) return
    setBusy("download")
    const ok = await downloadReceiptPdf(docData)
    setBusy(null)
    if (ok) {
      toastSuccess("Money receipt downloaded.", { id: "receipt-pdf" })
    } else {
      toastError(null, "Couldn't generate the PDF. Please try again.", {
        id: "receipt-pdf",
      })
    }
  }

  async function handlePrint() {
    if (busy) return
    setBusy("print")
    const ok = await printReceiptPdf(docData)
    setBusy(null)
    if (!ok) {
      toastError(null, "Couldn't open the print dialog. Please try again.", {
        id: "receipt-print",
      })
    }
  }

  return (
    <DetailLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            loading={busy === "print"}
            disabled={busy !== null}
          >
            {busy === "print" ? null : <Printer className="size-4" aria-hidden />}
            Print
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            loading={busy === "download"}
            disabled={busy !== null}
          >
            {busy === "download" ? null : (
              <Download className="size-4" aria-hidden />
            )}
            Download
          </Button>
        </div>
      </div>

      <div className="flex w-full justify-center">
        <ReceiptPaper
          invoice={invoice}
          payment={combined.payment}
          methodLabel={combined.methodLabel}
        />
      </div>
    </DetailLayout>
  )
}
