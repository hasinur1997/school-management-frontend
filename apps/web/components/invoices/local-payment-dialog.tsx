"use client"

/**
 * Records a counter (cash) payment against one invoice (task F-5.3). Permitted
 * staff (`fee.collect`) enter an amount; the API records the payment and
 * re-derives the invoice's `paid_amount`/`status` — the client never marks it
 * paid. RHF + Zod, `422` → field errors + form banner, success toast + close, no
 * double submit (`code-standards.md`, Forms).
 *
 * **Partial payments** are only offered when the settings toggle allows it
 * (`useAllowPartialPayment`, from settings task 6.4). When partial is off — or
 * the toggle can't be read — the amount is locked to the full outstanding
 * balance. Money is a decimal **string** end to end, validated with integer-cents
 * string math (`subtractMoney`), never parsed into a float.
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Wallet } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { DEFAULT_CURRENCY, formatMoney, subtractMoney } from "@/lib/format"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { useRecordLocalPayment } from "@/hooks/invoices"
import { useAllowPartialPayment } from "@/hooks/settings"
import {
  invoiceOutstanding,
  invoiceStudentName,
  type Invoice,
  type Payment,
} from "@/types/invoice"

// Money: a non-negative decimal string with at most 2 fractional digits.
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
// Zero in any 2dp form ("0", "0.0", "0.00").
const ZERO_RE = /^0+(\.0+)?$/

const schema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(AMOUNT_RE, "Enter a valid amount (up to 2 decimals)"),
})

type LocalPaymentValues = z.infer<typeof schema>

// 422 field names that map to an input (only `amount` is user-entered; `method`
// is always cash, so a `method` error falls through to the form banner).
const FIELD_NAMES = ["amount"] as const

export interface LocalPaymentDialogProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired with the recorded payment after a successful write. */
  onRecorded?: (payment: Payment) => void
}

export function LocalPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onRecorded,
}: LocalPaymentDialogProps) {
  const recordPayment = useRecordLocalPayment()
  // Only fetch settings while the dialog is open; a failed read → partial off.
  const { allowPartial, isLoading: settingsLoading } =
    useAllowPartialPayment(open)

  const outstanding = invoiceOutstanding(invoice)
  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<LocalPaymentValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: outstanding },
  })

  // Seed the amount with the outstanding balance each time the dialog opens.
  React.useEffect(() => {
    if (!open) return
    form.reset({ amount: outstanding })
    setBanner(null)
  }, [open, outstanding, form])

  // The field is editable only when partial is explicitly allowed; otherwise the
  // full outstanding balance is collected (and stays pinned to it).
  const amountLocked = !allowPartial
  React.useEffect(() => {
    if (open && amountLocked) form.setValue("amount", outstanding)
  }, [open, amountLocked, outstanding, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const amount = amountLocked ? outstanding : values.amount.trim()

    // Client-side bounds guard (the API stays authoritative): a payment must be
    // positive and never exceed the outstanding balance.
    if (ZERO_RE.test(amount)) {
      form.setError("amount", { message: "Enter an amount greater than zero." })
      return
    }
    if (subtractMoney(outstanding, amount).startsWith("-")) {
      form.setError("amount", {
        message: `Amount can't exceed the outstanding ${formatMoney(outstanding)}.`,
      })
      return
    }

    try {
      const payment = await recordPayment.mutateAsync({
        invoiceId: invoice.id,
        amount,
        method: "cash",
      })
      toastSuccess("Payment recorded.", { id: "local-payment" })
      onOpenChange(false)
      onRecorded?.(payment)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't record the payment.", { id: "local-payment" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader icon={<Wallet />}>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Record a counter payment for {invoiceStudentName(invoice)}. The
            invoice status updates from the recorded payment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            {/* Outstanding summary */}
            <div className="flex items-center justify-between rounded-lg border border-surface-border bg-subtle/50 px-3.5 py-2.5 text-sm">
              <span className="text-copy-muted">Outstanding balance</span>
              <span className="font-semibold tabular-nums text-copy-primary">
                {formatMoney(outstanding)}
              </span>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Amount received</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-copy-muted"
                        aria-hidden
                      >
                        {DEFAULT_CURRENCY}
                      </span>
                      <Input
                        {...field}
                        inputMode="decimal"
                        placeholder="0.00"
                        autoComplete="off"
                        className="pl-7 tabular-nums"
                        disabled={submitting || amountLocked}
                        readOnly={amountLocked}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  {amountLocked ? (
                    <p className="text-xs text-copy-muted">
                      {settingsLoading
                        ? "Checking whether partial payments are allowed…"
                        : "Partial payments are disabled — the full outstanding balance will be collected."}
                    </p>
                  ) : null}
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Recording…
                  </>
                ) : (
                  "Record payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
