# Task F-5.3 — Payments (Online SSLCommerz, Local, Receipt)

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `todo` |
| Depends on | 5.2, 6.4 (partial-payment toggle from settings) |
| Blocks | — |
| Feature spec | `feature-specs/15-fees-payments.md` |
| Contract | `docs/api/fees-payments.md` |
| Endpoints | `POST /invoices/{id}/payments/online`, `POST /invoices/{id}/payments/local`, `GET /payments/sslcommerz/{result}`, `GET /payments/{id}/receipt` |

## Objective
Pay an invoice online (SSLCommerz hosted checkout) or at the counter (local), then download the money-receipt PDF.

## Screens / Components
- **Online payment** (student/parent or staff): trigger `POST .../payments/online` → redirect the browser to the returned SSLCommerz checkout URL. On return (`GET /payments/sslcommerz/{result}`), **refetch the invoice** to reflect the result — the API/IPN is the source of truth.
- **Local payment** (permitted staff): a dialog to record a counter payment; only offer **partial** entry when the settings toggle allows it (read from 6.4 settings).
- **Receipt**: after a successful payment, offer the money-receipt PDF (`GET /payments/{id}/receipt`) as a streamed download.

## Behavior
- The client never marks invoices paid — always reconcile by refetching. IPN (`POST /payments/sslcommerz/ipn`) is server-only; the frontend never calls it.
- Money as decimal strings; no float math.

## Rules
- Permission-gated for local payment; payment validity is server-owned (idempotent IPN).

## Check When Done
- [ ] Online payment redirects to SSLCommerz; returning reflects the API's paid state after refetch.
- [ ] Local payment records correctly (partial only when settings allow).
- [ ] Money-receipt PDF downloads as a streamed file.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
