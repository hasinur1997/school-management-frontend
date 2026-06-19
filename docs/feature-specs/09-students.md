# 09 — Students, Parents & Enrollments

Student profiles, parent accounts and linking, and enrollment views. Contract: `docs/api/students.md`.

## Endpoints consumed

- Student list / detail / update endpoints.
- Parent create and student-linking endpoints (parents are created by admins and linked to one or more students).
- `GET /students/{id}/attendance` (used by attendance module; referenced here for the profile summary).
- Enrollment data per the contract.

## Implementation

- Students list: paginated table (photo, name, ID/roll, class/section, status badge incl. TC, branch for super admin), filters by class/section/session/status, search.
- Student detail: profile, guardian/parent links, enrollment history, and links to attendance/results.
- Admin edit form for student profile fields.
- Parents: list, create parent account, link/unlink to students (many-to-many). Surface credential dispatch on parent creation.
- Respect record-level access: students/parents only ever see their own / linked records — the API enforces this; the UI shows a not-found/access state on `403/404`.

## Rules

- TC students are visibly flagged and excluded from active operations by the API; reflect their status, don't special-case logic client-side.
- Permission-gated; super admin sees all branches.

## Check When Done

- Students can be listed, filtered, viewed, and edited.
- Parents can be created and linked/unlinked to students.
- A student/parent session sees only permitted records.
- Loading/empty/error states present.
- `npm run build` passes.
