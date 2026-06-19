# Task F-5.1 — Fee Structures & Invoice Generation

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `todo` |
| Depends on | 2.1 |
| Blocks | 5.2 |
| Feature spec | `feature-specs/15-fees-payments.md` |
| Contract | `docs/api/fees-payments.md` |
| Endpoints | `GET /fee-structures`, `POST /fee-structures`, `PUT /fee-structures/{id}`, `POST /invoices/generate` |

## Objective
Manage per-class fee structures and trigger monthly invoice generation.

## Screens / Components
- **Fee structures**: list + create/edit dialog (class, fee type/head, amount as decimal string, frequency per contract). Money right-aligned, tabular.
- **Generate invoices**: an admin action (`POST /invoices/generate`) with month/session/class parameters per contract and a confirmation summarizing scope; on success, refresh invoices (5.2).

## Behavior
- RHF + Zod; money as decimal strings (no float math); `422` → fields; success toast.
- Generation is bulk + server-side (chunked); the UI triggers and reflects the result count.

## Rules
- Permission-gated; super admin per branch / consolidated. TC students excluded from invoicing by the API.

## Check When Done
- [ ] Fee structures listed and (with permission) created/edited.
- [ ] Invoice generation triggers and reports results.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
