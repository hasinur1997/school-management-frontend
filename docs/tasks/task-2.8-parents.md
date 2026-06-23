# Task F-2.8 — Parents (List, Create, Link/Unlink, My Students)

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 2.7 |
| Blocks | — |
| Feature spec | `feature-specs/09-students.md` |
| Contract | `docs/api/students.md` |
| Endpoints | `GET /parents`, `POST /parents`, `POST /parents/{parent}/students`, `DELETE /parents/{parent}/students/{student}`, `GET /me/students` |

## Objective
Admin-managed parent accounts linked many-to-many to students, plus the parent's own "my students" view.

## Screens / Components
- **List**: paginated parents table (name, contact, linked-student count). Mobile → card list.
- **Create parent** dialog: personal/contact info; surface the API's credential-dispatch confirmation on creation.
- **Link / unlink students**: add one or more students to a parent (`POST /parents/{parent}/students`), remove (`DELETE .../students/{student}`).
- **My students** (parent role): `GET /me/students` listing linked children with quick links to their attendance/results/invoices.

## Behavior
- `422` → fields; success toasts; invalidate parent + linked-student caches on link/unlink.

## Rules
- Parents created by admins (no self-registration). Record-level access: a parent sees only linked students (API-enforced) → access/not-found state on `403/404`.

## Check When Done
- [x] Parents listed, created (with credential dispatch), and linked/unlinked to students.
- [x] Parent session sees only linked children via `/me/students`.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
