# 05 — Dashboard

Landing screen after login with role-appropriate summary cards. Contract: `docs/api/settings.md` (`GET /dashboard`).

## Endpoints consumed

- `GET /dashboard` → summary figures scoped to the user's branch (or consolidated for super admin).

## Implementation

- Fetch `GET /dashboard` and render summary cards from whatever the API returns for this user (e.g. counts of students/teachers, today's attendance, pending admissions, fee collection, profit/loss). Render only the cards the response contains — do not assume figures the API didn't send.
- Currency figures use the money formatter (decimal strings, no float math); counts use tabular figures.
- Skeleton loading state; empty/error states.
- For super admin, the dashboard reflects the active branch / consolidated selection from the shell.

## Rules

- Display only API-provided figures; compute nothing client-side.

## Check When Done

- Dashboard renders the summary cards from `GET /dashboard`.
- Super-admin branch/consolidated switch updates the figures.
- Loading, empty, and error states present.
- `npm run build` passes.
