# 16 — Finance (Income, Expenses, Assets)

Entry and listing of income, expenses, and assets per branch. Contract: `docs/api/finance.md`.

## Endpoints consumed

- Income list/create (and the system-generated income entries from fee payments appear here, read-only).
- Expense list/create.
- Asset list/create, plus total asset value.
- Category endpoints per the contract.

## Implementation

- Three sections (tabs or routes): **Income**, **Expenses**, **Assets**, each a paginated list + create/edit dialog with category, amount/value (decimal string, right-aligned), date, and description.
- Fee-payment income entries are shown as system-generated and are read-only.
- Assets section shows total asset value (per branch / consolidated for super admin) as a summary card.
- Category filters and date filters on each list.

## Rules

- Money as decimal strings; no client-side float math or aggregation — totals come from the API.
- Permission-gated; super admin sees all branches / consolidated.

## Check When Done

- Income, expense, and asset items can be listed, filtered, and (with permission) created/edited.
- System-generated fee income is shown read-only.
- Total asset value reflects the API.
- Loading/empty/error states present.
- `npm run build` passes.
