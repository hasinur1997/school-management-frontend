# Task F-5.2 — Invoices (List, Detail, My Invoices)

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `done` |
| Depends on | 5.1 |
| Blocks | 5.3 |
| Feature spec | `feature-specs/15-fees-payments.md` |
| Contract | `docs/api/fees-payments.md` |
| Endpoints | `GET /invoices`, `GET /invoices/{id}`, `GET /me/invoices` |

## Objective
List and view monthly invoices with paid/unpaid/partial status, plus the student/parent "my invoices" view.

## Screens / Components
- **Invoices list**: paginated table (student, month, amount right-aligned decimal string, status badge paid/unpaid/partial), filters by class/session/month/status. Mobile → card list.
- **Detail**: invoice line items, amounts, payment history, and the pay/receipt actions (wired in 5.3).
- **My invoices** (student/parent): `GET /me/invoices` for own/children; parent child selector.
- On Student details page on tution fee tab all kinds payable things will be shown and pay

## Behavior
- Money as decimal strings; status badge mapping per `ui-context.md`.
- Record-level access enforced by API → access/not-found on `403/404`.

## Rules
- Permission-gated; super admin per branch / consolidated.

## Check When Done
- [x] Invoices listed with correct statuses + filters; detail renders amounts + payment history.
- [x] Student/parent see only their own/children's invoices.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.

## Implementation Notes (against the real backend `~/Herd/app-api`, 10.2/10.3)
The ticket predates the invoice backend; the shipped screens follow the real
`InvoiceResource`/`PaymentResource` contract, which differs from the ticket in two ways:
- **No line items.** An invoice is a single monthly fee amount (the class fee copied at
  generation), not a set of line items. `amount` / `paid_amount` are `decimal:2` strings;
  the detail shows Total / Paid / Outstanding (`subtractMoney`) + payment history.
- **No `session` filter, and month is `(month:int, year:int)` not `YYYY-MM`.** The staff
  list (`GET /invoices`, `invoice.view`) filters by `class_id` / `status` / `month` / `year`.
- Endpoints: `GET /invoices` (staff, paginated), `GET /invoices/{id}` (no permission mw —
  `StudentPolicy::viewInvoices`, 404-hiding), `GET /me/invoices` (student own / parent child
  via `student_id`). Pay/receipt actions are wired in 5.3.

### Files
- Types `types/invoice.ts` (status/method/payment enums, labels, tones, month helper);
  money helper `subtractMoney` added to `lib/format/number.ts`.
- Read hooks `hooks/invoices/` — `useInvoices` (list), `useInvoice` (detail),
  `useMyInvoices` (self/child).
- UI `components/invoices/` — `InvoicesList` (staff, `invoice.view`), `InvoiceDetail`
  (+ `InvoicePayments`), `StudentInvoicesPanel` (per-student, picks staff vs `/me/invoices`
  by permission). Routes `/invoices` + `/invoices/[id]` (with `?from=` back-link).
- Wiring: Finance → **Invoices** nav item (`invoice.view`); the student-detail and profile
  **Tuition fees** tabs now render `StudentInvoicesPanel` (was "coming soon").
- Parent per-child selection is the existing `/my-students` list → student-detail fees tab
  (mirrors parent attendance/results); no separate child dropdown was added.

## Manual invoice CRUD + search (added, backend 10.2)
Beyond bulk generation, single invoices can now be created/edited/deleted and the list is
searchable. Guarded by `fee.manage` (same slug as fee structures / generation).
- **Backend** (`~/Herd/app-api`): `POST /invoices` (store), `PUT /invoices/{id}` (update),
  `DELETE /invoices/{id}` (destroy) in `routes/api/v1/fees.php`; `InvoiceService::create`
  derives branch + active enrollment + `INV-…` number, `update` recomputes status from
  `paid_amount` when the amount changes, `delete` 422s once a payment exists. `ListInvoices`
  gained a `search` param → `applySearch()` spans `invoice_no` + the (withTrashed) student's
  `name_en`/`name_bn`, guardian email/mobile, present address, and the linked user's
  email/phone. Store/Update requests enforce (student, month, year) uniqueness. Tests:
  `InvoiceCrudTest` (10) green; `InvoiceReadsTest` corrected to `public_id` (were stale).
- **Frontend**: `useCreateInvoice`/`useUpdateInvoice`/`useDeleteInvoice`
  (`hooks/invoices/use-invoice-mutations.ts`); `InvoiceFormDialog` (RHF+Zod, single-student
  search picker for create, locked student on edit/preset, 422→field/banner); the list gained
  a debounced search box, **New invoice** button + edit/delete row actions (`fee.manage`); the
  student Billing tab gained a preset **New invoice** button.

## Printable invoice document (design import)
The single-invoice detail (`/invoices/[id]`) was reworked to the imported
"Invoice" Claude Design handoff as an A4 paper document (`InvoicePaper`,
`components/invoices/invoice-paper.tsx`): navy-ruled school header (default
institution + seal, matching the mark sheet), billed-to block, a period / due
date / status info box, a single monthly-fee line item, a Subtotal / Paid /
Outstanding summary (Outstanding highlighted; a fully-paid invoice shows "Total
paid" in green), the real payment history, a payment-method note, and a motto +
signature footer. Like the mark sheet it is a fixed-palette paper (ignores
light/dark theme). `InvoiceDetail` keeps the loading / not-found / error states
and adds a **Print / Save as PDF** button (`window.print()`); print isolation
lives in `packages/ui/src/styles/globals.css` (`.invoice-paper-root`), which
hides the app shell so only the document prints. Fields the backend doesn't
model (line items, discount, guardian/class/roll, issue date) were dropped
rather than fabricated.
