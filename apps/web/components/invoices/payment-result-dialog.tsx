"use client"

/**
 * Payment result popup (task F-5.3). Shown when the browser returns from the
 * SSLCommerz checkout — the API landing (`GET/POST /payments/sslcommerz/{result}`)
 * 302-redirects here as `/invoices/{id}?payment=success|fail|cancel`.
 *
 * This is a **presentation-only** popup: it never marks the invoice paid. The
 * source of truth is the API/IPN, so `InvoiceDetail` refetches the invoice on
 * return and this dialog only reflects the redirect outcome. On success we tell
 * the user the receipt updates once the payment is confirmed; on fail/cancel we
 * invite a retry. Closing (X icon or button) strips the `?payment` marker from
 * the URL so a refresh won't reopen it.
 */

import * as React from "react"
import { CheckCircle2, XCircle, Ban } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@/components/button"

export type PaymentResult = "success" | "fail" | "cancel"

const CONTENT: Record<
  PaymentResult,
  {
    icon: React.ReactNode
    accent: string
    title: string
    description: string
  }
> = {
  success: {
    icon: <CheckCircle2 className="size-6" aria-hidden />,
    accent: "bg-success/10 text-success",
    title: "Payment successful",
    description:
      "Your payment went through. This invoice updates to paid once the gateway confirms it — the money receipt will then be available here.",
  },
  fail: {
    icon: <XCircle className="size-6" aria-hidden />,
    accent: "bg-error/10 text-error",
    title: "Payment failed",
    description:
      "We couldn't complete this payment. No amount was charged. You can try paying online again or record a counter payment.",
  },
  cancel: {
    icon: <Ban className="size-6" aria-hidden />,
    accent: "bg-muted text-copy-muted",
    title: "Payment cancelled",
    description:
      "You cancelled the payment before it completed. Nothing was charged — you can start again whenever you're ready.",
  },
}

export function PaymentResultDialog({
  result,
  open,
  onOpenChange,
}: {
  result: PaymentResult
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const c = CONTENT[result]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <span
            className={`flex size-14 items-center justify-center rounded-full ${c.accent}`}
            aria-hidden
          >
            {c.icon}
          </span>
          <DialogHeader className="items-center gap-2 pr-0 text-center">
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription className="text-center">
              {c.description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
