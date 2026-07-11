"use client"

/**
 * Collect a counter payment across **all** of a student's outstanding invoices
 * (task F-5.3 follow-up). Staff (`fee.collect`) enter one amount; it's split
 * oldest-invoice-first (`allocateOldestFirst`) and recorded as one local payment
 * per invoice (`useCollectStudentPayment`) — the API has no bulk endpoint, so
 * this is a client-side split, but each invoice is still settled server-side and
 * the client never marks anything paid.
 *
 * Paying the **full total** always works; a **partial** total is offered only
 * when the branch's partial-payment setting allows it (`useAllowPartialPayment`)
 * — otherwise the amount is locked to the total, since the backend requires each
 * per-invoice payment to equal that invoice's exact outstanding when partial is
 * off. Money is decimal-string, integer-cents math throughout (no float).
 *
 * Online (gateway) payment is per-invoice only (one SSLCommerz session settles
 * one invoice), so this counter flow is local-only by design.
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
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@/components/button"
import { ErrorPanel } from "@/components/error-state"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { getErrorMessage, toastSuccess } from "@/lib/toast"
import { DEFAULT_CURRENCY, formatMoney, subtractMoney, sumMoney } from "@/lib/format"
import {
  useAllowPartialPayment,
} from "@/hooks/settings"
import {
  useCollectStudentPayment,
  useStudentOutstandingInvoices,
} from "@/hooks/invoices"
import { allocateOldestFirst } from "@/lib/payment/allocate"
import { invoiceMonthLabel, invoiceOutstanding, type Invoice } from "@/types/invoice"

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
const ZERO_RE = /^0+(\.0+)?$/

const schema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(AMOUNT_RE, "Enter a valid amount (up to 2 decimals)"),
})

type CollectValues = z.infer<typeof schema>

export interface CollectPaymentDialogProps {
  studentId: string
  studentName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CollectPaymentDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
}: CollectPaymentDialogProps) {
  const outstandingQuery = useStudentOutstandingInvoices(studentId, open)
  const { allowPartial, isLoading: settingsLoading } =
    useAllowPartialPayment(open)
  const collect = useCollectStudentPayment()

  const invoices = React.useMemo(
    () => outstandingQuery.data ?? [],
    [outstandingQuery.data]
  )
  const total = React.useMemo(
    () => sumMoney(invoices.map(invoiceOutstanding)),
    [invoices]
  )
  const amountLocked = !allowPartial

  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<CollectValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "" },
  })

  // Seed the amount with the full total once the outstanding invoices load (and
  // pin it to the total whenever partial entry is disabled). Left untouched once
  // the staffer edits it (partial mode).
  React.useEffect(() => {
    if (!open) return
    if (amountLocked || !form.formState.isDirty) {
      form.setValue("amount", total)
    }
    // Re-seed when the total resolves or the lock state flips.
  }, [open, total, amountLocked, form])

  // Clear any stale failure banner only when the dialog (re)opens — never on a
  // refetch, so a partial-failure message survives the outstanding reload.
  React.useEffect(() => {
    if (open) setBanner(null)
  }, [open])

  function handleOpenChange(next: boolean) {
    if (collect.isPending) return
    onOpenChange(next)
  }

  // Live split preview for the entered amount (oldest invoice first).
  const enteredAmount = amountLocked ? total : form.watch("amount")
  const preview = React.useMemo(() => {
    if (!AMOUNT_RE.test(enteredAmount ?? "")) return []
    return allocateOldestFirst(invoices, enteredAmount)
  }, [invoices, enteredAmount])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const amount = amountLocked ? total : values.amount.trim()

    if (ZERO_RE.test(amount)) {
      form.setError("amount", { message: "Enter an amount greater than zero." })
      return
    }
    if (subtractMoney(total, amount).startsWith("-")) {
      form.setError("amount", {
        message: `Amount can't exceed the total outstanding ${formatMoney(total)}.`,
      })
      return
    }

    const allocations = allocateOldestFirst(invoices, amount)
    if (allocations.length === 0) return

    const result = await collect.mutateAsync({ allocations })

    if (result.failedAt) {
      const failedLabel = invoiceMonthLabel(
        result.failedAt.invoice.month,
        result.failedAt.invoice.year
      )
      const applied = formatMoney(result.appliedAmount)
      setBanner(
        `Applied ${applied} to ${result.recorded.length} invoice(s). The payment for ${failedLabel} failed: ${getErrorMessage(result.failedAt.error, "please try again.")}`
      )
      // Refetch so the preview/total reflect what actually got applied.
      void outstandingQuery.refetch()
      return
    }

    toastSuccess(
      `Recorded ${formatMoney(result.appliedAmount)} across ${result.recorded.length} invoice(s).`,
      { id: "collect-payment" }
    )
    onOpenChange(false)
  })

  const submitting = collect.isPending
  const isEmpty =
    !outstandingQuery.isPending && !outstandingQuery.isError && invoices.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader icon={<Wallet />}>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>
            Record a counter payment across {studentName ?? "this student"}&rsquo;s
            outstanding invoices. It&rsquo;s applied to the oldest invoice first.
          </DialogDescription>
        </DialogHeader>

        {outstandingQuery.isPending ? (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : outstandingQuery.isError ? (
          <ErrorPanel
            description="We couldn't load this student's outstanding invoices."
            onRetry={() => void outstandingQuery.refetch()}
            className="border-0 bg-transparent p-0"
          />
        ) : isEmpty ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-copy-muted">
              This student has no outstanding invoices — nothing to collect.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              <FormBanner message={banner} />

              <div className="flex items-center justify-between rounded-lg border border-surface-border bg-subtle/50 px-3.5 py-2.5 text-sm">
                <span className="text-copy-muted">
                  Total outstanding · {invoices.length} invoice
                  {invoices.length === 1 ? "" : "s"}
                </span>
                <span className="font-semibold tabular-nums text-copy-primary">
                  {formatMoney(total)}
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
                          value={amountLocked ? total : field.value}
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
                          : "Partial payments are disabled — the full total will be collected."}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />

              {/* Split preview — which invoices this amount settles. */}
              {preview.length > 0 ? (
                <div className="rounded-lg border border-surface-border-subtle">
                  <p className="border-b border-surface-border-subtle px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-copy-muted">
                    Applied to
                  </p>
                  <ul className="flex flex-col">
                    {preview.map(({ invoice, amount }) => (
                      <PreviewRow
                        key={invoice.id}
                        invoice={invoice}
                        amount={amount}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

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
        )}
      </DialogContent>
    </Dialog>
  )
}

/** One line of the split preview: an invoice, its outstanding, and what's applied. */
function PreviewRow({
  invoice,
  amount,
}: {
  invoice: Invoice
  amount: string
}) {
  const outstanding = invoiceOutstanding(invoice)
  // A partial hit on the boundary invoice (applied < its outstanding).
  const partial = subtractMoney(outstanding, amount) !== "0.00"
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-2 text-sm">
      <span className="min-w-0 truncate text-copy-secondary">
        {invoiceMonthLabel(invoice.month, invoice.year)}
        {partial ? (
          <span className="ml-1.5 text-xs text-copy-muted">(partial)</span>
        ) : null}
      </span>
      <span className="shrink-0 font-medium tabular-nums text-copy-primary">
        {formatMoney(amount)}
      </span>
    </li>
  )
}
