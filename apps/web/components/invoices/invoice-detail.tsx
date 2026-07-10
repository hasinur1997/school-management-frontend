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
 * `globals.css` hide the app shell so only the document prints. The pay /
 * receipt actions are wired in task 5.3.
 */

import * as React from "react"
import Link from "next/link"
import { Printer, Receipt } from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailSkeleton } from "@/components/skeletons"
import { DetailBackLink, DetailLayout } from "@/components/detail/detail-ui"
import { useInvoice } from "@/hooks/invoices"
import { isNotFoundError } from "@/lib/api"
import { InvoicePaper } from "./invoice-paper"

export function InvoiceDetail({
  id,
  backHref = "/invoices",
  backLabel = "Back to invoices",
}: {
  id: string
  /** Where the back link points (staff → list; self/parent → their view). */
  backHref?: string
  backLabel?: string
}) {
  const { data: invoice, isPending, isError, error, refetch } = useInvoice(id)

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

  return (
    <DetailLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <DetailBackLink href={backHref}>{backLabel}</DetailBackLink>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="size-4" aria-hidden />
          Print / Save as PDF
        </Button>
      </div>

      <div className="flex w-full justify-center">
        <InvoicePaper invoice={invoice} />
      </div>
    </DetailLayout>
  )
}
