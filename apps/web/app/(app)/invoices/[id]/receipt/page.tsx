"use client"

/**
 * Money-receipt route (task F-5.3). The single page reached from an invoice's
 * "View money receipt" action; renders the client-generated combined receipt
 * with Print / Download. Not gated client-side — the API authorizes
 * `GET /invoices/{id}` per-record and hides a denial as `404` (handled inside
 * `ReceiptView`).
 *
 * `params`/`searchParams` are promises, unwrapped with `React.use`. An optional
 * `?from=` names where the back link returns to; it falls back to the invoice
 * detail so "back" always lands somewhere sensible.
 */

import * as React from "react"

import { ReceiptView } from "@/components/invoices"

export default function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = React.use(params)
  const { from } = React.use(searchParams)

  // Only accept an in-app absolute path as the return target (guards against an
  // open-redirect via a crafted `from`); otherwise return to the invoice.
  const backHref =
    from && from.startsWith("/") ? from : `/invoices/${String(id)}`

  return <ReceiptView id={String(id)} backHref={backHref} />
}
