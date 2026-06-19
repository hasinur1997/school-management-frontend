# Task F-2.3 — Teacher Assignments & Branches Management

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 2.1, 2.4 (teacher select source) |
| Blocks | — |
| Feature spec | `feature-specs/06-academic-structure.md` |
| Contract | `docs/api/academic-structure.md` |
| Endpoints | `GET/POST /teacher-assignments`, `GET/PUT/DELETE /teacher-assignments/{id}`; `GET/POST /branches`, `GET/PUT/DELETE /branches/{id}` |

## Objective
Class-teacher / subject-teacher assignment management, and branch management (super admin only).

## Screens / Components
- **Teacher assignments**: list with filters `teacher_id`, `class_id`, `session_id`; create/edit dialog selecting teacher + class + section + subject (shared selectors from 2.1); delete with confirm.
- **Branches** (super-admin-gated): list + create/edit dialog (name, code, address, contact) + delete with confirm. This is the source for the 1.5 branch switcher.

## Behavior
- RHF + Zod; `422` → fields; success toast; invalidate assignment/branch caches (and the branch switcher list).

## Rules
- Branch CRUD is super-admin only; assignments require their documented permission. Gate with `<Can>`.

## Check When Done
- [x] Assignments list/filter/create/edit/delete works.
- [x] Branches CRUD works for super admin and is hidden for others.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
