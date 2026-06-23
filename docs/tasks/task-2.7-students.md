# Task F-2.7 — Students (List, Detail, Edit, Photo, Status, Enrollments)

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 2.1, 2.6 |
| Blocks | attendance, results, fees, documents surfaces |
| Feature spec | `feature-specs/09-students.md` |
| Contract | `docs/api/students.md` |
| Endpoints | `GET /students`, `GET /students/{id}`, `PUT /students/{id}`, `PATCH /students/{id}/status`, `POST /students/{id}/photo`, `GET /students/{id}/enrollments`, `GET /students/{id}/attendance` (linked) |

## Objective
Student management and profile, including enrollment history and links into attendance/results/documents.

## Screens / Components
- **List**: paginated table (photo, name EN/BN, admission_no/roll, class/section, status badge incl. **TC**, branch for super admin), filters by class/section/session/status, search. Mobile → card list.
- **Detail**: bilingual profile, guardian/parent links, **enrollment history** (`/students/{id}/enrollments`), and links to attendance/results/ID-card/TC.
- **Edit form**: profile fields (admission_no immutable — disabled/blocked, expect `422` if changed).
- **Status toggle** active/inactive (`tc` is rejected here — issued via Documents 6.2); **photo upload** (multipart jpg/png ≤2MB).

## Behavior
- Record-level access enforced by API: a student/parent session sees only its own/linked records → render an access/not-found state on `403/404`.
- TC students are visibly flagged (info badge); don't special-case exclusion client-side — reflect API status.

## Rules
- Permission-gated; super admin sees all branches. admission_no/birth_reg_no immutable.

## Check When Done
- [x] Students listed, filtered, viewed, edited, photo-updated, status-toggled (not TC).
- [x] Enrollment history renders; TC flagged.
- [x] Student/parent session sees only permitted records; loading/empty/error states present.
- [x] `npm run build` passes.
