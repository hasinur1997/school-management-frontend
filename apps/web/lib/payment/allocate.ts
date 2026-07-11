/**
 * Allocates a single counter-payment amount across a student's outstanding
 * invoices (task F-5.3 follow-up — "pay all / partial across all"). The backend
 * exposes only a **per-invoice** local-payment endpoint, so paying a student's
 * total (or a partial of it) means splitting the amount into one payment per
 * invoice. The split is **oldest invoice first**: each invoice is filled to its
 * full outstanding before the next, so only the last funded invoice can receive
 * a partial amount.
 *
 * This matters for the partial-payment setting: when partial is **off**, every
 * per-invoice payment must equal that invoice's exact outstanding, which holds
 * for a full-total payment (each invoice is filled completely); a partial total
 * is only offered when the setting allows it. All arithmetic is integer-cents
 * string math (no float), mirroring `lib/format/number.ts`.
 */

import { invoiceOutstanding, type Invoice } from "@/types/invoice"

/** One invoice and the amount of the total to apply to it (2dp, &gt; 0). */
export interface InvoiceAllocation {
  invoice: Invoice
  /** Decimal string, e.g. `"1500.00"`. */
  amount: string
}

/** Parse a 2dp decimal money string to signed integer cents (no float). */
function toCents(value: string): number {
  const raw = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return 0
  const negative = raw.startsWith("-")
  const [intPart = "0", decPart = ""] = raw.replace(/^-/, "").split(".")
  const cents = Number(intPart) * 100 + Number(decPart.slice(0, 2).padEnd(2, "0"))
  return negative ? -cents : cents
}

/** Render non-negative integer cents back to a 2dp decimal string. */
function fromCents(cents: number): string {
  const abs = Math.max(0, Math.trunc(cents))
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`
}

/**
 * Invoices sorted oldest billing period first (year, then month), with the
 * opaque id as a stable tiebreak. Does not mutate the input.
 */
export function sortOldestFirst(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort(
    (a, b) =>
      a.year - b.year ||
      a.month - b.month ||
      String(a.id).localeCompare(String(b.id))
  )
}

/**
 * Split `total` across `invoices`, oldest first, filling each to its full
 * outstanding before moving on. Invoices with no outstanding are skipped, and
 * allocation stops once the total is exhausted — so the result covers only the
 * invoices the payment actually reaches.
 */
export function allocateOldestFirst(
  invoices: Invoice[],
  total: string
): InvoiceAllocation[] {
  let remaining = toCents(total)
  const allocations: InvoiceAllocation[] = []

  for (const invoice of sortOldestFirst(invoices)) {
    if (remaining <= 0) break
    const outstanding = toCents(invoiceOutstanding(invoice))
    if (outstanding <= 0) continue

    const pay = Math.min(remaining, outstanding)
    allocations.push({ invoice, amount: fromCents(pay) })
    remaining -= pay
  }

  return allocations
}
