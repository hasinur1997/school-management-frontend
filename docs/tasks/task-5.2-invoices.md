# Task F-5.2 — Invoices (List, Detail, My Invoices)

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `todo` |
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

## Behavior
- Money as decimal strings; status badge mapping per `ui-context.md`.
- Record-level access enforced by API → access/not-found on `403/404`.

## Rules
- Permission-gated; super admin per branch / consolidated.

## Check When Done
- [ ] Invoices listed with correct statuses + filters; detail renders line items + history.
- [ ] Student/parent see only their own/children's invoices.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
