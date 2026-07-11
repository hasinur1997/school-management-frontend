"use client"

/**
 * Invoice detail (task F-5.2, backend 10.2/10.3). Renders one invoice as the
 * printable A4 document (`InvoicePaper`, from the imported "Invoice" Claude
 * Design handoff) from `useInvoice` (`GET /invoices/{id}`): the school header,
 * the billed student, the month's fee, a Total / Paid / Outstanding summary,
 * and the real payment history.
 *
 * The route carries no permission middleware — the API authorizes per-record
 * via `StudentPolicy::viewInvoices` and hides a denial as `404`, so an
 * out-of-branch, missing, or unauthorized id surfaces as not-found (never
 * `403`) for staff, the student, or a linked parent alike.
 *
 * Print uses the browser dialog; the `.invoice-paper-root` isolation rules in
 * `globals.css` hide the app shell so only the document prints. Below the
 * document, `InvoiceActions` (print-hidden) carries the pay / record / receipt
 * actions (task 5.3).
 *
 * On return from the SSLCommerz checkout the browser lands back here with
 * `?paid=1` (`justReturnedFromGateway`); the invoice is **refetched** so its
 * status reflects the API/IPN result (never trusted from the redirect), and the
 * marker is stripped from the URL.
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
import { toast, toastError, toastSuccess } from "@/lib/toast"
import { invoiceHasReceipt } from "@/types/invoice"
import { InvoicePaper } from "./invoice-paper"
import { InvoiceActions } from "./invoice-actions"
import { downloadInvoicePdf, printInvoicePdf } from "./invoice-document"
import {
  PaymentResultDialog,
  type PaymentResult,
} from "./payment-result-dialog"

export function InvoiceDetail({
  id,
  backHref = "/invoices",
  backLabel = "Back to invoices",
  justReturnedFromGateway = false,
  paymentResult,
}: {
  id: string
  /** Where the back link points (staff → list; self/parent → their view). */
  backHref?: string
  backLabel?: string
  /** True when the browser just returned from the SSLCommerz checkout. */
  justReturnedFromGateway?: boolean
  /** SSLCommerz landing outcome, when the browser returned via `?payment=`. */
  paymentResult?: PaymentResult
}) {
  const { data: invoice, isPending, isError, error, refetch } = useInvoice(id)
  const [busy, setBusy] = React.useState<"download" | "print" | null>(null)

  // The result popup opens when we arrive with a `?payment=` outcome, and stays
  // controlled from here so closing it (X / Done) can strip the URL marker.
  const [resultOpen, setResultOpen] = React.useState(Boolean(paymentResult))

  // Reconcile once on return from the gateway: the API is the source of truth,
  // so refetch and clear the marker rather than trust the redirect.
  const reconciled = React.useRef(false)
  React.useEffect(() => {
    if (!justReturnedFromGateway || reconciled.current) return
    reconciled.current = true
    void refetch()
    if (!paymentResult) {
      // Legacy `?paid=1` path — no popup, just a quiet status refresh.
      toast("Updating payment status…", { id: "invoice-pay-return" })
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("paid")
      url.searchParams.delete("payment")
      window.history.replaceState(window.history.state, "", url.toString())
    }
  }, [justReturnedFromGateway, paymentResult, refetch])

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
          description="We couldn't load this invoice."
          onRetry={() => void refetch()}
        />
      </DetailLayout>
    )
  }

  const docData = {
    invoice,
    fileName: `invoice-${invoice.invoice_no ?? invoice.id}`,
  }

  async function handleDownload() {
    if (busy) return
    setBusy("download")
    const ok = await downloadInvoicePdf(docData)
    setBusy(null)
    if (ok) {
      toastSuccess("Invoice downloaded.", { id: "invoice-pdf" })
    } else {
      toastError(null, "Couldn't generate the PDF. Please try again.", {
        id: "invoice-pdf",
      })
    }
  }

  async function handlePrint() {
    if (busy) return
    setBusy("print")
    const ok = await printInvoicePdf(docData)
    setBusy(null)
    if (!ok) {
      toastError(null, "Couldn't open the print dialog. Please try again.", {
        id: "invoice-print",
      })
    }
  }

  return (
    <DetailLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <div className="flex flex-wrap items-center gap-2">
          {invoiceHasReceipt(invoice) ? (
            <Link
              href={`/invoices/${invoice.id}/receipt?from=${encodeURIComponent(
                `/invoices/${invoice.id}`
              )}`}
            >
              <Button type="button" variant="outline" size="sm">
                <Receipt className="size-4" aria-hidden />
                View money receipt
              </Button>
            </Link>
          ) : null}
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
        <InvoicePaper invoice={invoice} />
      </div>

      <InvoiceActions invoice={invoice} />

      {paymentResult ? (
        <PaymentResultDialog
          result={paymentResult}
          open={resultOpen}
          onOpenChange={setResultOpen}
        />
      ) : null}
    </DetailLayout>
  )
}
