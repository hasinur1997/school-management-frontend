# Task F-2.1 — Academic Shared Selectors & Read Hooks

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 1.3, 1.5 |
| Blocks | 2.2, attendance, marks, promotion, fees, reports |
| Feature spec | `feature-specs/06-academic-structure.md` |
| Contract | `docs/api/academic-structure.md` |
| Endpoints | `GET /sessions`, `GET /classes`, `GET /classes/{class}/sections`, `GET /classes/{class}/subjects` |

## Objective
The shared, cached dropdown sources reused across every module that filters by academic context. Build these first so downstream modules consume them.

## Components
- `SessionSelect`, `ClassSelect`, `SectionSelect` (depends on selected class), `SubjectSelect` (depends on selected class) — each backed by its read endpoint and cached via TanStack Query.
- Read hooks: `useSessions`, `useClasses`, `useSections(classId)`, `useSubjects(classId)`.
- Read endpoints are available to all authenticated users.

## Rules
- Cache academic data (server-cached too); invalidate the relevant keys when 2.2/2.3 writes succeed.
- Selects are controlled, support placeholder/loading/empty/disabled states, and surface `branch_id` automatically for super admin only.

## Check When Done
- [x] All four selectors fetch, cache, and render loading/empty states.
- [x] Section/Subject selects react to the chosen class.
- [x] Hooks reused (no duplicate fetch logic) by later modules.
- [x] `npm run build` passes.
