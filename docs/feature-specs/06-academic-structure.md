# 06 — Academic Structure

Surfaces for branches, academic sessions, classes, sections, subjects, and teacher assignments. Contract: `docs/api/academic-structure.md`.

## Endpoints consumed

- `GET /classes`, `GET /classes/{class}/sections`, `GET /classes/{class}/subjects` (readable by any authenticated user — used as dropdown sources elsewhere).
- `GET /teacher-assignments?teacher_id=&class_id=&session_id=`.
- Branch / session / class / section / subject and assignment write endpoints per the contract (permission-gated).

## Implementation

- Management screens (settings area) for sessions, classes, sections, subjects, and teacher/subject assignments — list + create/edit dialogs, each gated by its required permission.
- Reusable selector components — `SessionSelect`, `ClassSelect`, `SectionSelect`, `SubjectSelect` — backed by the read endpoints and cached via TanStack Query. These are the shared dropdown sources for attendance, marks, promotion, fees, reports, etc.
- Branch column/filter for super admin; regular users are auto-scoped.

## Rules

- Read endpoints are available to all authenticated users; writes require the documented permissions.
- Cache academic data (it's server-cached too); invalidate the relevant keys on write.

## Check When Done

- Sessions/classes/sections/subjects/assignments can be listed and (with permission) created/edited.
- Shared selectors fetch and cache correctly and are reused by other modules.
- Loading/empty/error states present.
- `npm run build` passes.
