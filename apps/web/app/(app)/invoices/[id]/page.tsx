"use client"

/**
 * Invoice detail route (task F-5.2). Not gated client-side: the API authorizes
 * `GET /invoices/{id}` via `StudentPolicy::viewInvoices` (staff, the student
 * itself, or a linked parent) and hides a denial as `404`, so a student/parent
 * session can open its own invoice without `invoice.view`. Not-found/access
 * surfaces inside `InvoiceDetail`.
 *
 * `params` and `searchParams` are promises, unwrapped with `React.use`. An
 * optional `?from=` names where the back link returns to (the fees tab that
 * linked here); it falls back to the staff list. `?payment=success|fail|cancel`
 * marks a return from the SSLCommerz checkout: the detail refetches to reflect
 * the API result and shows the result popup. (`?paid=1` is the legacy marker,
 * still honoured as a plain refetch.)
 */

import * as React from "react"

import { InvoiceDetail } from "@/components/invoices"

export default function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; paid?: string; payment?: string }>
}) {
  const { id } = React.use(params)
  const { from, paid, payment } = React.use(searchParams)

  // Only accept an in-app absolute path as the return target (guards against an
  // open-redirect via a crafted `from`); anything else falls back to the list.
  const backHref = from && from.startsWith("/") ? from : "/invoices"

  // The SSLCommerz landing redirects here as `?payment=success|fail|cancel`.
  const paymentResult =
    payment === "success" || payment === "fail" || payment === "cancel"
      ? payment
      : undefined

  return (
    <InvoiceDetail
      id={String(id)}
      backHref={backHref}
      justReturnedFromGateway={paid === "1" || paymentResult !== undefined}
      paymentResult={paymentResult}
    />
  )
}
