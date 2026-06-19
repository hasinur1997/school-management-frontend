# Task F-2.2 — Academic Structure Management (Sessions, Classes, Sections, Subjects)

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 2.1 |
| Blocks | — |
| Feature spec | `feature-specs/06-academic-structure.md` |
| Contract | `docs/api/academic-structure.md` |
| Endpoints | `GET/POST /sessions`, `PUT/DELETE /sessions/{id}`; `GET/POST /classes`, `PUT/DELETE /classes/{id}`; `POST /classes/{class}/sections`, `PUT/DELETE /sections/{id}`; `POST /classes/{class}/subjects`, `PUT/DELETE /subjects/{id}` |

## Objective
Management screens (settings area) to list and (with permission) create/edit/delete academic sessions, classes, sections, and subjects.

## Screens / Components
- **Sessions**: list + create/edit dialog (name, start/end, active flag), delete with confirm.
- **Classes**: list + create/edit dialog; nested **Sections** and **Subjects** managed from a class detail/expandable view (`POST /classes/{class}/sections`, `POST /classes/{class}/subjects`).
- **Sections / Subjects**: create within a class, edit/delete via their own endpoints.
- Branch column/filter for super admin; regular users auto-scoped.

## Behavior
- RHF + Zod; `422` → field errors; success toast + cache invalidation of the 2.1 selector keys.
- Destructive deletes confirm first (error-token dialog).

## Rules
- Reads open to all authenticated users; writes require the documented permissions — gate buttons/actions with `<Can>`.

## Check When Done
- [x] Sessions/classes/sections/subjects can be listed and (with permission) created/edited/deleted.
- [x] Writes invalidate the shared selector caches.
- [x] Loading/empty/error states present; gating correct.
- [x] `npm run build` passes.
