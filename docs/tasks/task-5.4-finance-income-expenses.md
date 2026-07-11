# Task F-5.4 — Finance: Income & Expenses

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `done` |
| Depends on | 5.6 (categories) |
| Blocks | — |
| Feature spec | `feature-specs/16-finance.md` |
| Contract | `docs/api/finance.md` |
| Endpoints | `GET /incomes`, `POST /incomes`, `PUT /incomes/{id}`, `DELETE /incomes/{id}`, `GET /expenses`, `POST /expenses`, `PUT /expenses/{id}`, `DELETE /expenses/{id}` |

## Objective
List and manage income and expense entries per branch, with category + date filters.

## Screens / Components
- **Income** and **Expenses** sections (tabs or routes), each a paginated list + create/edit dialog: category (from 5.6), amount (decimal string, right-aligned), date, description. Mobile → card list.
- **Fee-payment income entries are system-generated and read-only** — flag them and disable edit/delete.
- Category + date-range filters on each list.

## Behavior
- RHF + Zod; money as decimal strings; `422` → fields; success toast; deletes confirm first.

## Rules
- No client-side float math or aggregation — totals come from the API.
- Permission-gated; super admin sees all branches / consolidated.

## Check When Done
- [x] Income + expenses listed, filtered, created/edited/deleted (with permission).
- [x] System-generated fee income shown read-only.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
