# 18 — Reports

Filterable reports across finance, students, teachers, and assets, with PDF export. Contract: `docs/api/reports.md`.

## Endpoints consumed

- Report endpoints for income, expenses, total students, assets, teachers, and a profit/loss summary, each accepting filter params (weekly / monthly / yearly / custom date range; per branch or consolidated).
- PDF export endpoints (stream `application/pdf`).

## Implementation

- **Reports screen**: a shared filter bar (period preset + custom date range, branch / consolidated for super admin) driving the selected report.
- Render each report's figures as summary cards and/or tables exactly as the API returns them (money as decimal strings, right-aligned, tabular).
- **Profit/loss** summary view.
- **Export**: trigger the API's PDF export for the current filter as a streamed download.

## Rules

- All aggregation is server-side; the client never sums or computes report figures.
- Filters map directly to the documented query params.
- Permission-gated; only super admin gets consolidated/branch switching.

## Check When Done

- Each report renders correct figures for weekly/monthly/yearly/custom filters.
- Branch vs consolidated works for super admin.
- PDF export downloads as a streamed file.
- Loading/empty/error states present.
- `npm run build` passes.
