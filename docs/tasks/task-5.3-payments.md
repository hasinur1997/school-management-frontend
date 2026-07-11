# Task F-5.3 — Payments (Online SSLCommerz, Local, Receipt)

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `done` |
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
- **Receipt**: every invoice exposes **View invoice** and **View money receipt** entry points (list rows, student fees panel, detail header). The money receipt is a **client-rendered PDF** — the on-screen `receipt-paper.tsx` (matched to the imported design) exported via `paper-pdf.ts` (html-to-image → jsPDF) with Print/Download on its own page (`/invoices/{id}/receipt`). It shows **one combined receipt** summing all settled payments. The backend `GET /payments/{id}/receipt` stream is superseded (left intact, unused).
  - **PDF fidelity**: the exporter must render pixel-identical to the on-screen paper. Bengali text (school name/motto) uses `Noto_Sans_Bengali` loaded app-wide in `layout.tsx` as `--font-bengali` — the papers reference it via `FONT_BN` so the raster embeds the real font instead of a system fallback. `paper-pdf.ts` captures at a 4× pixel ratio (~384 DPI), force-loads all faces before snapshotting, and double-renders to warm html-to-image's font-embed cache.

## Behavior
- The client never marks invoices paid — always reconcile by refetching. IPN (`POST /payments/sslcommerz/ipn`) is server-only; the frontend never calls it.
- Money as decimal strings; no float math.

## Rules
- Permission-gated for local payment; payment validity is server-owned (idempotent IPN).

## Check When Done
- [x] Online payment redirects to SSLCommerz; returning reflects the API's paid state after refetch.
- [x] Local payment records correctly (partial only when settings allow).
- [x] Money-receipt PDF is generated client-side (combined receipt) with Print + Download; reachable via per-invoice View invoice / View money receipt.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
