"use client"

/**
 * SSLCommerz payment-return page (task F-5.3). SSLCommerz sends the browser here
 * after the hosted checkout: `/payment/return?tran_id=…&status=success|fail|cancel`
 * (URLs built in the Laravel `SslCommerzGateway`). It's a standalone public route
 * — no app shell, no auth — so the cross-site redirect always lands cleanly.
 *
 * On `success` it calls the public **reconcile** endpoint (`POST
 * /payments/sslcommerz/reconcile`), which re-validates the transaction against
 * SSLCommerz and settles the payment (idempotent with the server IPN). The result
 * modal then deep-links to the paid invoice and its money receipt. `fail`/`cancel`
 * just report the outcome — nothing was charged.
 */

import * as React from "react"
import Link from "next/link"
import { CheckCircle2, XCircle, Ban, Loader2 } from "lucide-react"

import { Button } from "@/components/button"
import { publicApi } from "@/lib/api/client"

type Outcome = "success" | "fail" | "cancel"

type ReconcileResult = {
  status: string
  invoice_id: string | null
  receipt_no: string | null
}

export default function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ tran_id?: string; status?: string }>
}) {
  const { tran_id, status } = React.use(searchParams)

  const outcome: Outcome =
    status === "fail" || status === "cancel" ? status : "success"

  // For a successful return we settle server-side (validated against SSLCommerz)
  // and learn the invoice / receipt to link to.
  const [reconciling, setReconciling] = React.useState(outcome === "success")
  const [result, setResult] = React.useState<ReconcileResult | null>(null)

  React.useEffect(() => {
    if (outcome !== "success" || !tran_id) {
      setReconciling(false)
      return
    }
    let active = true
    ;(async () => {
      try {
        const data = await publicApi.post<ReconcileResult>(
          "/payments/sslcommerz/reconcile",
          { tran_id }
        )
        if (active) setResult(data)
      } catch {
        if (active) setResult(null)
      } finally {
        if (active) setReconciling(false)
      }
    })()
    return () => {
      active = false
    }
  }, [outcome, tran_id])

  const paid = result?.status === "paid"

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface p-8 text-center shadow-modal">
        {reconciling ? (
          <Reconciling />
        ) : outcome === "success" ? (
          <Success
            paid={paid}
            invoiceId={result?.invoice_id ?? null}
            receiptNo={result?.receipt_no ?? null}
          />
        ) : outcome === "fail" ? (
          <Failed />
        ) : (
          <Cancelled />
        )}
      </div>
    </main>
  )
}

function Badge({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span
      aria-hidden
      className={`mx-auto flex size-16 items-center justify-center rounded-full ${className}`}
    >
      {children}
    </span>
  )
}

function Reconciling() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Badge className="bg-muted text-copy-muted">
        <Loader2 className="size-8 animate-spin" />
      </Badge>
      <h1 className="text-xl font-semibold text-copy-primary">
        Confirming your payment…
      </h1>
      <p className="text-sm text-copy-muted">
        We&apos;re verifying the transaction with the gateway. This only takes a
        moment.
      </p>
    </div>
  )
}

function Success({
  paid,
  invoiceId,
  receiptNo,
}: {
  paid: boolean
  invoiceId: string | null
  receiptNo: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Badge className="bg-success/10 text-success">
        <CheckCircle2 className="size-8" />
      </Badge>
      <h1 className="text-xl font-semibold text-copy-primary">
        Payment successful
      </h1>
      <p className="text-sm text-copy-muted">
        {paid
          ? "Your payment is confirmed and the invoice is now marked paid."
          : "Your payment went through and will be confirmed shortly."}
        {receiptNo ? (
          <>
            {" "}
            Receipt <span className="font-medium">{receiptNo}</span>.
          </>
        ) : null}
      </p>
      <div className="mt-2 flex w-full flex-col gap-2">
        {invoiceId ? (
          <>
            {paid ? (
              <Link href={`/invoices/${invoiceId}/receipt`} className="w-full">
                <Button className="w-full">View money receipt</Button>
              </Link>
            ) : null}
            <Link href={`/invoices/${invoiceId}`} className="w-full">
              <Button variant={paid ? "outline" : "default"} className="w-full">
                View invoice
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/invoices" className="w-full">
            <Button className="w-full">Go to invoices</Button>
          </Link>
        )}
      </div>
    </div>
  )
}

function Failed() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Badge className="bg-error/10 text-error">
        <XCircle className="size-8" />
      </Badge>
      <h1 className="text-xl font-semibold text-copy-primary">Payment failed</h1>
      <p className="text-sm text-copy-muted">
        We couldn&apos;t complete this payment and nothing was charged. You can
        try again from the invoice.
      </p>
      <Link href="/invoices" className="mt-2 w-full">
        <Button className="w-full">Back to invoices</Button>
      </Link>
    </div>
  )
}

function Cancelled() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Badge className="bg-muted text-copy-muted">
        <Ban className="size-8" />
      </Badge>
      <h1 className="text-xl font-semibold text-copy-primary">
        Payment cancelled
      </h1>
      <p className="text-sm text-copy-muted">
        You cancelled the payment before it completed. Nothing was charged — you
        can start again whenever you&apos;re ready.
      </p>
      <Link href="/invoices" className="mt-2 w-full">
        <Button className="w-full">Back to invoices</Button>
      </Link>
    </div>
  )
}
