# 15 — Fees & Payments

Monthly invoices, SSLCommerz online payment, local payment, and money receipts. Contract: `docs/api/fees-payments.md`.

## Endpoints consumed

- Invoice list / detail endpoints (paid/unpaid/partial).
- `POST /invoices/{id}/payments/online` → starts SSLCommerz; returns the hosted-checkout URL to redirect to.
- `POST /invoices/{id}/payments/local` → staff records a counter payment.
- `POST /payments/sslcommerz/ipn` → **server-only** callback; the frontend never calls it.
- Money receipt PDF endpoint (streams `application/pdf`).

## Implementation

- **Invoices list**: paginated table with student, month, amount (right-aligned, decimal string), and status badge (paid/unpaid/partial); filters by class/session/month/status.
- **Online payment** (student/parent or staff): trigger `payments/online`, then redirect the browser to the returned SSLCommerz checkout URL. On return, refetch the invoice to reflect the result; the API (via IPN) is the source of truth for paid status.
- **Local payment** (permitted staff): a dialog to record a counter payment; respect the partial-payment settings toggle — only offer partial entry if settings allow it (read from settings).
- **Receipt**: after a successful payment, offer the money-receipt PDF as a streamed download.

## Rules

- The client never validates payments or marks invoices paid — only the API does (idempotent IPN). Always reconcile by refetching.
- Money handled as decimal strings; no float math.

## Check When Done

- Invoices list with correct statuses and filters.
- Online payment redirects to SSLCommerz; returning reflects the API's paid state after refetch.
- Local payment records correctly (partial only when settings allow).
- Money receipt PDF downloads as a streamed file.
- Loading/empty/error states present.
- `npm run build` passes.
