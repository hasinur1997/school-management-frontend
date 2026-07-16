"use client"

/**
 * Payment actions for one invoice (task F-5.3). A print-hidden panel shown under
 * the invoice document with:
 *
 *   - **Pay online** (any authorized viewer — student/parent or staff): starts
 *     an SSLCommerz session and redirects the browser to the hosted checkout.
 *     On return the detail refetches (the API/IPN is the source of truth); this
 *     never marks the invoice paid.
 *   - **Record payment** (staff with `fee.collect`): opens the counter-payment
 *     dialog, offering partial entry only when settings allow it.
 *
 * The money receipt now lives on its own page (`/invoices/{id}/receipt`, a
 * client-rendered PDF) reached from the detail header, so this panel no longer
 * carries receipt downloads. Renders nothing when there's no outstanding balance
 * to collect.
 */

import * as React from "react"
import { CreditCard, Wallet } from "lucide-react"

import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { toastError } from "@/lib/toast"
import { formatMoney } from "@/lib/format"
import { useStartOnlinePayment } from "@/hooks/invoices"
import { paymentRedirectUrl } from "@/types/admission"
import {
  invoiceHasOutstanding,
  invoiceOutstanding,
  type Invoice,
} from "@/types/invoice"
import { FEE_COLLECT } from "./permissions"
import { LocalPaymentDialog } from "./local-payment-dialog"

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const [localOpen, setLocalOpen] = React.useState(false)
  const startOnline = useStartOnlinePayment()

  const hasOutstanding = invoiceHasOutstanding(invoice)

  async function payOnline() {
    try {
      const returnUrl = `${window.location.origin}/invoices/${invoice.id}?paid=1`
      const res = await startOnline.mutateAsync({
        invoiceId: invoice.id,
        returnUrl,
      })
      const url = paymentRedirectUrl(res)
      if (!url) {
        toastError(null, "Couldn't start the payment. Please try again.", {
          id: "invoice-pay",
        })
        return
      }
      window.location.assign(url)
    } catch (error) {
      toastError(error, "Couldn't start the payment. Please try again.", {
        id: "invoice-pay",
      })
    }
  }

  // Nothing to collect → no panel.
  if (!hasOutstanding) return null

  return (
    <section className="mx-auto w-full max-w-[794px] rounded-2xl border border-surface-border bg-surface mt-3 p-5 print:hidden">
      <h2 className="text-sm font-semibold text-copy-primary">Payments</h2>

      {hasOutstanding ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-copy-muted">Outstanding balance</span>
            <span className="font-semibold tabular-nums text-copy-primary">
              {formatMoney(invoiceOutstanding(invoice))}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={payOnline} loading={startOnline.isPending}>
              <CreditCard className="size-4" aria-hidden />
              {startOnline.isPending ? "Starting…" : "Pay online"}
            </Button>
            <Can permission={FEE_COLLECT}>
              <Button
                variant="outline"
                onClick={() => setLocalOpen(true)}
                disabled={startOnline.isPending}
              >
                <Wallet className="size-4" aria-hidden />
                Record payment
              </Button>
            </Can>
          </div>
        </div>
      ) : null}

      <LocalPaymentDialog
        invoice={invoice}
        open={localOpen}
        onOpenChange={setLocalOpen}
      />
    </section>
  )
}
