# Task F-6.3 — Reports (Filters, All Reports, PDF Export)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `todo` |
| Depends on | 1.5, 2.1 |
| Blocks | — |
| Feature spec | `feature-specs/18-reports.md` |
| Contract | `docs/api/reports.md` |
| Endpoints | `GET /reports/income`, `GET /reports/expense`, `GET /reports/profit-loss`, `GET /reports/students`, `GET /reports/teachers`, `GET /reports/assets`, `GET /reports/fees`, `GET /reports/{type}/pdf` |

## Objective
A unified reports surface with a shared filter bar driving each report and PDF export.

## Screens / Components
- **Shared filter bar**: period preset (weekly / monthly / yearly) + custom date range, branch / consolidated for super admin. Maps directly to the documented query params.
- **Report views**: income, expense, **profit/loss**, students, teachers, assets, fees — each rendered as summary cards and/or tables exactly as the API returns (money decimal strings, right-aligned, tabular). Tabs or routed sub-pages per report type.
- **Export**: `GET /reports/{type}/pdf` for the current filter as a streamed download.

## Behavior
- Changing filters re-fetches; loading skeletons matching cards/tables.

## Rules
- All aggregation server-side; the client never sums report figures.
- Permission-gated; only super admin gets consolidated/branch switching.

## Check When Done
- [ ] Each report renders correct figures for weekly/monthly/yearly/custom filters.
- [ ] Branch vs consolidated works for super admin; PDF export downloads as a streamed file.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
