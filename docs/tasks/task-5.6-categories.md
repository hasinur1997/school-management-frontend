# Task F-5.6 — Finance Categories Management

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `done` |
| Depends on | 1.5 |
| Blocks | 5.4, 5.5 |
| Feature spec | `feature-specs/16-finance.md` |
| Contract | `docs/api/finance.md` |
| Endpoints | `GET /categories`, `POST /categories`, `PUT /categories/{id}`, `DELETE /categories/{id}` |

## Objective
Manage income/expense categories used as the dropdown source for finance entries.

## Screens / Components
- **Categories list**: paginated, filterable by `type` (income | expense); create/edit dialog (name, type enum); delete with confirm.
- A `CategorySelect` reusable component (filtered by type) consumed by 5.4 and 5.5, cached via TanStack Query.

## Behavior
- RHF + Zod; `422` → fields; success toast; invalidate category caches on write.

## Rules
- Permission-gated; super admin per branch.

## Check When Done
- [x] Categories listed by type, created/edited/deleted (with permission).
- [x] `CategorySelect` reused by income/expense/asset forms.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
