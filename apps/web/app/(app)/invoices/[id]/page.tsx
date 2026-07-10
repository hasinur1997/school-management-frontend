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
 * linked here); it falls back to the staff list.
 */

import * as React from "react"

import { InvoiceDetail } from "@/components/invoices"

export default function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = React.use(params)
  const { from } = React.use(searchParams)

  // Only accept an in-app absolute path as the return target (guards against an
  // open-redirect via a crafted `from`); anything else falls back to the list.
  const backHref = from && from.startsWith("/") ? from : "/invoices"

  return <InvoiceDetail id={String(id)} backHref={backHref} />
}
