/**
 * Permission that gates the staff invoices module (task F-5.2, backend 10.2).
 *
 * The backend guards the invoice list with `invoice.view`
 * (`routes/api/v1/fees.php`). The detail (`GET /invoices/{id}`) and
 * `GET /me/invoices` carry no permission middleware — they authorize per-record
 * via `StudentPolicy::viewInvoices` (staff / the student itself / a linked
 * parent), so a student or parent reads their own without `invoice.view`. The
 * API's `403`/`404` stays the real boundary — gating only hides what the user
 * can't reach.
 */
export const INVOICE_VIEW = "invoice.view"

/**
 * Manual invoice CRUD (create/update/delete) is guarded by `fee.manage` — the
 * same slug that gates fee structures and bulk generation
 * (`routes/api/v1/fees.php`).
 */
export const INVOICE_MANAGE = "fee.manage"

/** Counter-payment collection (wired in task 5.3); reserved here for gating. */
export const FEE_COLLECT = "fee.collect"
