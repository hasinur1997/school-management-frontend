/**
 * Invoice contract types (task F-5.2, backend 10.2/10.3).
 *
 * Implemented against the real backend (`~/Herd/app-api`): `InvoiceResource`
 * (one monthly invoice) and `PaymentResource` (a payment recorded against it,
 * loaded only on the detail read). An invoice bills one student for a single
 * `(month, year)`, copying the class fee amount at generation so a later fee
 * edit never alters an issued invoice. Money is the decimal **string** the API
 * returns (`"1500.00"`, `decimal:2` cast) and is never parsed into a float for
 * arithmetic (`code-standards.md`, UI Conventions).
 *
 * Ids are opaque `public_id` hashes (strings). The list is branch-scoped
 * automatically (invoices carry their own `branch_id`); there is no `session`
 * filter — the backend narrows by class (via the enrollment), month, year, and
 * status only.
 */

import { EMPTY_VALUE, subtractMoney, sumMoney } from "@/lib/format"
import type { StatusTone } from "@/components/status-badge"

/** Settlement status of an invoice (`App\Enums\InvoiceStatus`). */
export type InvoiceStatus = "unpaid" | "partial" | "paid"

/** Human labels for each status (the list/detail never invent these). */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
}

/** Status → badge tone per `ui-context.md` (Status Colors). */
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  unpaid: "error",
  partial: "warning",
  paid: "success",
}

/** Statuses in selector order (filters). */
export const INVOICE_STATUSES: InvoiceStatus[] = ["unpaid", "partial", "paid"]

/** Filter for status, with an `all` pass-through (no filter sent). */
export type InvoiceStatusFilter = InvoiceStatus | "all"

/** How a payment was made (`App\Enums\PaymentMethod`). */
export type PaymentMethod = "cash" | "sslcommerz"

/** Human labels for each payment method. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  sslcommerz: "Online",
}

/** Settlement status of a payment (`App\Enums\PaymentStatus`). */
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled"

/** Human labels for each payment status. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
}

/** Payment status → badge tone. */
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  pending: "warning",
  paid: "success",
  failed: "error",
  cancelled: "neutral",
}

/** The student an invoice bills — `id` is a `public_id` hash. */
export interface InvoiceStudentRef {
  id: string
  name_en: string | null
  /** Guardian (the student's father); detail read only, for the document. */
  guardian_name?: string | null
}

/**
 * The enrollment an invoice was generated from — class / section / roll at
 * generation time (historical, so a later promotion never rewrites an issued
 * invoice). Present only on the detail read (`GET /invoices/{id}`), for the
 * invoice document's "Billed to" block.
 */
export interface InvoiceEnrollmentRef {
  class: string | null
  section: string | null
  roll_no: number | null
}

/**
 * `PaymentResource` — one payment recorded against an invoice. Loaded only on
 * the detail read (`GET /invoices/{id}`), newest first. The `receipt_url`
 * streams the money-receipt PDF (wired for download in task 5.3).
 */
export interface Payment {
  id: string
  receipt_no: string | null
  /** Decimal string, e.g. `"1500.00"`. Never a float. */
  amount: string
  method: PaymentMethod
  status: PaymentStatus
  /** ISO-8601 timestamp, or null while pending. */
  paid_at: string | null
  /** Relative API path streaming the receipt PDF. */
  receipt_url: string
}

/**
 * One described charge on an invoice (e.g. "Tuition fee", "Admission fee"). The
 * invoice's `amount` is the sum of its items. Present only on the detail read
 * (`GET /invoices/{id}`); the list reads omit it. Money is a decimal string.
 */
export interface InvoiceItem {
  description: string
  /** Decimal string, e.g. `"1500.00"`. Never a float. */
  amount: string
}

/**
 * `GET /invoices` (list) / `GET /invoices/{id}` (detail). `payments` and `items`
 * are present only on the detail read. `month` is 1–12 and `year` is a full year
 * — both are integers, not a `YYYY-MM` string.
 */
export interface Invoice {
  id: string
  invoice_no: string | null
  /** Null only if the billed student was hard-deleted (defensive). */
  student: InvoiceStudentRef | null
  /** Class/section/roll snapshot — detail read only (document "Billed to"). */
  enrollment?: InvoiceEnrollmentRef | null
  /** Billing month, 1–12. */
  month: number
  /** Billing year, e.g. 2026. */
  year: number
  /** Line items behind the total (detail read only), in entry order. */
  items?: InvoiceItem[]
  /** Invoice total (sum of `items`) — a decimal string, e.g. `"1500.00"`. */
  amount: string
  /** Amount settled so far — a decimal string. */
  paid_amount: string
  status: InvoiceStatus
  /** Due date as `YYYY-MM-DD`, or null. */
  due_date: string | null
  /** Payment history (detail read only), newest first. */
  payments?: Payment[]
}

/**
 * `POST /invoices/{id}/payments/local` body (task F-5.3) — a counter payment a
 * permitted staffer records against an invoice (`fee.collect`). The amount is a
 * decimal **string** (never a float); `method` is always `cash` for a counter
 * payment (the online path posts `sslcommerz`). The API derives the receipt
 * number, settlement time, and the invoice's new `paid_amount`/`status` — the
 * client never marks an invoice paid.
 */
export interface LocalPaymentInput {
  /** Decimal string, e.g. `"1500.00"`. */
  amount: string
  /** Always `cash` for a counter payment. */
  method?: PaymentMethod
}

/**
 * Params the staff list screen (`GET /invoices`) folds into the query (and
 * key). Branch isolation is automatic; `branch_id` here only scopes the cache
 * key for super-admin branch switching (the request interceptor forwards the
 * active branch). No `session` filter — the backend doesn't support one.
 */
export interface InvoiceListParams {
  student_id?: string | null
  class_id?: string | null
  status?: InvoiceStatusFilter
  /** Billing month, 1–12. */
  month?: number | null
  /** Billing year. */
  year?: number | null
  /** Free-text across invoice_no + student name/email/phone/address. */
  search?: string | null
  /** Super-admin cache scope; mirrors the active branch. */
  branch_id?: string | null
  page?: number
  per_page?: number
}

/**
 * `POST /invoices` body (manual create, `fee.manage`). The branch, enrollment,
 * invoice number, and initial status are derived server-side; the client sends
 * the student, period, one or more line items, and an optional due date. The
 * total is the sum of the items (server-computed). `student_id` is a `public_id`
 * hash the API resolves. Item amounts are decimal strings.
 */
export interface InvoiceInput {
  student_id: string
  /** Billing month, 1–12. */
  month: number
  /** Billing year. */
  year: number
  /** One or more described charges; the total is their sum. */
  items: InvoiceItem[]
  /** `YYYY-MM-DD`; omitted → the branch's configured due day. */
  due_date?: string | null
}

/**
 * `PUT /invoices/{id}` body. Only the line items, due date, and period are
 * editable — the student/branch/enrollment/invoice number identify the record
 * and stay fixed, and `paid_amount`/`status` are payment-derived (never
 * client-set). Sending `items` replaces the list and re-derives the total and
 * status against what's already been paid.
 */
export interface InvoiceUpdateInput {
  items?: InvoiceItem[]
  due_date?: string | null
  month?: number
  year?: number
}

/**
 * Params for the self-service read (`GET /me/invoices`). `student_id` names a
 * linked child for parents (ignored for students, who always get their own);
 * `year` narrows to one billing year.
 */
export interface MyInvoiceParams {
  student_id?: string | null
  year?: number | null
  page?: number
  per_page?: number
}

/** Full month names, indexed 1–12 (index 0 unused). */
const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/** Month options (1–12) with labels for the list filter. */
export const INVOICE_MONTHS = MONTH_NAMES.slice(1).map((label, i) => ({
  value: i + 1,
  label,
}))

/** Render an invoice's billing period, e.g. `"June 2026"`. */
export function invoiceMonthLabel(month: number, year: number): string {
  const name = MONTH_NAMES[month] ?? ""
  return name ? `${name} ${year}` : String(year)
}

/** Display name for the billed student, never blank. */
export function invoiceStudentName(invoice: Invoice): string {
  if (invoice.student === null) return "Unknown student"
  return invoice.student.name_en || `Student ${invoice.student.id}`
}

/**
 * The invoice's outstanding balance (`amount − paid_amount`) as a plain 2dp
 * decimal string — the amount a payment would settle. Uses integer-cents string
 * math (`subtractMoney`), never a float.
 */
export function invoiceOutstanding(invoice: Invoice): string {
  return subtractMoney(invoice.amount, invoice.paid_amount)
}

/** True while the invoice still has a positive balance left to collect. */
export function invoiceHasOutstanding(invoice: Invoice): boolean {
  const outstanding = invoiceOutstanding(invoice)
  return (
    outstanding !== EMPTY_VALUE &&
    !outstanding.startsWith("-") &&
    !/^0+(\.0+)?$/.test(outstanding)
  )
}

/**
 * True when the invoice has at least one settled payment, so a money receipt
 * exists. Derived from `status` (present on list reads too), so the receipt
 * entry point can be gated without loading the payment history.
 */
export function invoiceHasReceipt(invoice: Invoice): boolean {
  return invoice.status !== "unpaid"
}

/**
 * Roll all of an invoice's **settled** payments into a single money receipt
 * (task F-5.3). Amounts are summed with integer-cents string math (`sumMoney`),
 * never a float; the receipt date is the most recent settlement; `receipt_no`
 * is the latest payment's number; and `methodLabel` names the distinct methods
 * used (e.g. "Cash" or "Cash, Online"). Returns `null` when nothing is settled.
 *
 * The synthetic `Payment` reuses the real `Payment` shape so `ReceiptPaper` can
 * render it unchanged; `methodLabel` is passed alongside for the combined
 * method text (which the single-payment `method` enum can't express).
 */
export function buildCombinedReceipt(
  invoice: Invoice
): { payment: Payment; methodLabel: string } | null {
  const paid = (invoice.payments ?? []).filter((p) => p.status === "paid")
  if (paid.length === 0) return null

  // Most recent settlement (payments arrive newest-first, but don't rely on it).
  const latest = paid.reduce((a, b) => {
    const ta = a.paid_at ? Date.parse(a.paid_at) : 0
    const tb = b.paid_at ? Date.parse(b.paid_at) : 0
    return tb > ta ? b : a
  })

  const seen = new Set<PaymentMethod>()
  const methods: PaymentMethod[] = []
  for (const p of paid) {
    if (!seen.has(p.method)) {
      seen.add(p.method)
      methods.push(p.method)
    }
  }
  const methodLabel = methods
    .map((m) => PAYMENT_METHOD_LABELS[m] ?? m)
    .join(", ")

  return {
    payment: {
      id: `${invoice.id}-combined`,
      receipt_no: latest.receipt_no,
      amount: sumMoney(paid.map((p) => p.amount)),
      method: latest.method,
      status: "paid",
      paid_at: latest.paid_at,
      receipt_url: "",
    },
    methodLabel,
  }
}
