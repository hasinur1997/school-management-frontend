# Task F-5.1 — Fee Structures & Invoice Generation

| Field | Value |
|---|---|
| Phase | 5 — Finance |
| Status | `in-progress` (fee-structure CRUD done; invoice generation deferred to backend 10.2) |
| Depends on | 2.1 |
| Blocks | 5.2 |
| Feature spec | `feature-specs/15-fees-payments.md` |
| Contract | `docs/api/fees-payments.md` |
| Endpoints | `GET /fee-structures`, `POST /fee-structures`, `GET /fee-structures/{id}`, `PUT /fee-structures/{id}`, `DELETE /fee-structures/{id}`, `POST /invoices/generate` |
| Backend ref | 10.1 (fee-structure CRUD, revised 2026-07-09), 10.2 (invoice generation) |

## Objective
Manage per-class fee structures (full CRUD) and trigger monthly invoice generation.

## Fee Structure Model (per backend 10.1)
A fee structure is a **named** fee defined per (branch, session, class). A class may have several fees in one session (e.g. "Tuition Fee" monthly, "Admission Fee" one-time). `branch_id` is server-stamped and never sent from the client.

| Field | Rules |
|---|---|
| name | required, string, max 150 |
| description | optional, string, max 500 |
| fee_type | required enum: `monthly` \| `onetime` |
| session_id | required |
| class_id | required (belongs to branch) |
| amount | required, decimal **string**, ≥ 0, 2dp (e.g. `"1500.00"`) |

Unique per (session, class, name).

## Screens / Components
- **Fee structures list**: paginated table, filters `session_id`, `class_id`, `fee_type`; columns name, class, session, type badge (monthly/onetime), amount (right-aligned, tabular, decimal string). Mobile → card list.
- **Create/edit dialog**: name, description, `fee_type` select, session + class selectors (2.1), amount as decimal string. No `branch_id` field.
- **Delete**: confirm dialog; on `422` (fee referenced by existing invoices) surface the API message inline/toast rather than removing the row.
- **Generate invoices**: an admin action (`POST /invoices/generate`, backend 10.2) with month/session/class parameters per contract and a confirmation summarizing scope; on success, refresh invoices (5.2).

## Behavior
- RHF + Zod; money as decimal strings (no float math); `422` → fields; success toast; invalidate fee-structure caches on write.
- Duplicate (session, class, name) → `422` "A fee with this name already exists for this class and session" mapped to the `name` field.
- Delete blocked when invoiced → `422` "Cannot delete a fee that has been used in invoices"; out-of-branch id → `404` (access/not-found state).
- Amount edits only affect *future* invoice generation — surface this in the edit dialog (existing invoices keep their copied amount).
- Generation is bulk + server-side (chunked); the UI triggers and reflects the result count.

## Rules
- Permission-gated (`fee.manage`); super admin per branch / consolidated. TC students excluded from invoicing by the API.

## Check When Done
- [x] Fee structures listed with `session_id`/`class_id`/`fee_type` filters and (with permission) created/edited/deleted.
- [x] `fee_type` (`monthly`/`onetime`), `name`, `description` supported; multiple fees per class/session.
- [x] Money rendered as decimal strings; duplicate-name and delete-when-invoiced `422`s surfaced; out-of-branch `404` handled.
- [ ] Invoice generation triggers and reports results. ⚠️ deferred — needs backend 10.2 (`POST /invoices/generate` not yet specced).
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.

## Implementation Notes
- Route: `/fees` (`app/(app)/fees/`), gated on `fee.manage`; reached via the existing "Fees" nav item under Finance (permission `fee.manage`, `fees.view` as an additional exposer).
- Types `types/fee.ts`; read/write hooks `hooks/fees/`; UI `components/fees/` (`FeeStructuresList`, `FeeStructureFormDialog`).
- `branch_id` never sent — the API stamps it from the active branch (`BelongsToBranch`); the class selector is already branch-scoped.
- **Every field is editable on edit** — name/description/fee_type/session/class/amount are all sent on the `PUT`. Server re-checks (session, class, name) uniqueness (excluding the row) and re-derives `branch_id` from the class when it changes.
- Amount is a decimal string end-to-end (validated ≤ 2 dp, ≥ 0 via regex; `formatMoney` for display) — no float math.
- Duplicate-tuple `422` routed to the `name` field; delete `422` (fee used in invoices) surfaces the API message on the still-open confirm dialog.

## Backend rework (app-api, 10.1)
The backend was only half-reworked (model/migration/enum/resource new; requests/service/controller/routes still on the old `monthly_fee`, session/class immutable, no DELETE). Completed it to the reworked contract:
- `Store`/`Update`/`List` Form Requests → `name`/`description`/`fee_type`/`amount`; update accepts all fields (no `prohibited`), re-checks uniqueness excluding self; list gained a `fee_type` filter.
- `FeeStructureService` → full create/update (re-derives branch from class), `delete()` with a 422 guard when invoiced; `fee_type` filter.
- Added the `DELETE /fee-structures/{id}` route + controller `destroy`.
- Ran the pending `rework_fee_structures_for_named_fees` migration (made idempotent + fixed the unique-index/FK ordering after a prior partial run).
- Renamed lingering `monthly_fee` → `amount` in `InvoiceService`, `DemoSeeder`, and factory/tests.
- Tests: `FeeStructureCrudTest` rewritten to the new contract (12 green); `InvoiceGenerationTest` green. (`TransferCertificateTest` has pre-existing, unrelated 404 failures — TC endpoints aren't wired in this env.)
