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
 * `GET /invoices` (list) / `GET /invoices/{id}` (detail). `payments` is present
 * only on the detail read. `month` is 1–12 and `year` is a full year — both are
 * integers, not a `YYYY-MM` string.
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
  /** Invoice total — a decimal string, e.g. `"1500.00"`. */
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
 * only the student, period, amount, and an optional due date. `student_id` is a
 * `public_id` hash the API resolves. Amount is a decimal string.
 */
export interface InvoiceInput {
  student_id: string
  /** Billing month, 1–12. */
  month: number
  /** Billing year. */
  year: number
  /** Decimal string, ≥ 0, 2dp. */
  amount: string
  /** `YYYY-MM-DD`; omitted → the branch's configured due day. */
  due_date?: string | null
}

/**
 * `PUT /invoices/{id}` body. Only the amount, due date, and period are editable
 * — the student/branch/enrollment/invoice number identify the record and stay
 * fixed, and `paid_amount`/`status` are payment-derived (never client-set). A
 * changed amount re-derives the status against what's already been paid.
 */
export interface InvoiceUpdateInput {
  amount?: string
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
