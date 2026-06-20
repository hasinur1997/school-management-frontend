# Task F-2.4 — Teachers (List, Detail, Create/Edit, Status)

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 2.1 |
| Blocks | 2.3 (assignment teacher source), 3.3 |
| Feature spec | `feature-specs/07-teachers.md` |
| Contract | `docs/api/teachers.md` |
| Endpoints | `GET /teachers`, `GET /teachers/{id}`, `POST /teachers`, `PUT /teachers/{id}`, `PATCH /teachers/{id}/status`, `POST /teachers/{id}/photo`, `POST /teachers/{id}/resend-credentials` |

## Objective
Full teacher management: list, profile, create-with-assignments (API generates + sends credentials), edit, photo, status toggle, resend credentials.

## Screens / Components
- **List**: paginated table (photo, name, subjects, assigned classes, status badge, branch for super admin), search + status filter. Mobile → stacked card list.
- **Detail**: profile, assignments, attendance-summary link, photo, resend-credentials action.
- **Create/Edit form**: personal info, subject + class assignments (shared selectors), active/inactive. On create, surface the API's confirmation that credentials were dispatched.
- **Status toggle** (active/inactive) with confirmation; **photo upload** (multipart, jpg/png ≤2MB).

## Behavior
- `422` maps to fields; success toast + list refresh.
- Never construct/display passwords client-side beyond what the API returns.

## Rules
- All actions gated by documented teacher permissions; super admin sees all branches.

## Check When Done
- [x] Teachers listed, filtered, created (with assignments), edited, photo-updated, status-toggled, credentials resent.
- [x] Credential-dispatch confirmation shown on create.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
