# Task F-1.7 — Dashboard

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `done` |
| Depends on | 1.5 |
| Blocks | — |
| Feature spec | `feature-specs/05-dashboard.md` |
| Contract | `docs/api/settings.md` |
| Endpoints | `GET /dashboard` |

## Objective
Role-aware landing screen rendering only the summary figures the API returns for the current user/branch.

## Screens / Components
- Fetch `GET /dashboard`; render summary cards from whatever the response contains (e.g. student/teacher counts, today's attendance, pending admissions, fee collection, profit/loss). **Render only the cards present in the response** — assume no figure the API didn't send.
- Currency via money formatter (decimal strings, no float math); counts use tabular figures.
- Super admin: reflects the active branch / consolidated selection from the shell (re-fetch on branch change).

## Rules
- Display only API-provided figures; compute nothing client-side.

## States
- Skeleton loading; empty (no figures) and error states.

## Check When Done
- [x] Dashboard renders cards from `GET /dashboard`.
- [x] Super-admin branch/consolidated switch updates figures.
- [x] Loading / empty / error states present.
- [x] `npm run build` passes.
