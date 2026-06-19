# Task F-5.5 — Finance: Assets & Summary

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `todo` |
| Depends on | 5.6 (categories) |
| Blocks | — |
| Feature spec | `feature-specs/16-finance.md` |
| Contract | `docs/api/finance.md` |
| Endpoints | `GET /assets`, `GET /assets/summary`, `POST /assets`, `PUT /assets/{id}`, `DELETE /assets/{id}` |

## Objective
Manage assets and show total asset value / status breakdown.

## Screens / Components
- **Assets list**: paginated table + create/edit dialog (category, name, value as decimal string, status, date, description). Mobile → card list.
- **Summary card(s)**: total asset value and by-status breakdown from `GET /assets/summary` (per branch / consolidated for super admin).

## Behavior
- RHF + Zod; money as decimal strings; `422` → fields; success toast; deletes confirm first.
- Status badge per `ui-context.md`.

## Rules
- Total value comes from the API (`/assets/summary`); never sum client-side.
- Permission-gated; super admin sees all branches / consolidated.

## Check When Done
- [ ] Assets listed, filtered, created/edited/deleted (with permission).
- [ ] Total asset value + status breakdown reflect the API.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
