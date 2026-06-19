# Task F-1.6 — Global Command Search

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `done` |
| Depends on | 1.5 |
| Blocks | — |
| Feature spec | `feature-specs/04-app-shell.md` |
| Endpoints | reuses module list/search endpoints (students, teachers, classes, etc.) |

## Objective
The topbar center **command-palette** search across modules and entities, permission-filtered.

## Screens / Components
- A `Command`-style search box in the topbar center: `Cmd/Ctrl+K` focuses/opens it.
- Results group **navigable modules** (Dashboard, Students, Teachers, Settings, …) plus **records** (students, teachers, classes, …) queried from the relevant list/search endpoints. Selecting a result navigates to it.
- `≥ md`: full input; `< md`: collapses to a search icon that opens the `Command` dialog.

## Behavior
- Debounced queries; results permission-filtered (hide modules/records the user can't access).
- Loading + empty ("no results") states inside the panel.

## Rules
- Permission-filter every result; never surface a record the user lacks access to (API stays authoritative on select).

## Check When Done
- [x] `Cmd/Ctrl+K` opens search; modules + entities returned and navigate on select.
- [x] Results are permission-filtered; loading + empty states present.
- [x] Collapses to icon `< md`.
- [x] `npm run build` passes.
