# Task F-3.3 — Teacher Attendance (Check-in/out & Admin Correction)

| Field | Value |
|---|---|
| Phase | 3 — Attendance |
| Status | `done` |
| Depends on | 2.4 |
| Blocks | — |
| Feature spec | `feature-specs/11-teacher-attendance.md` |
| Contract | `docs/api/teacher-attendance.md` |
| Endpoints | `POST /teacher-attendance/check-in`, `POST /teacher-attendance/check-out`, `GET /teacher-attendance`, `PUT /teacher-attendance/{id}`, `GET /me/teacher-attendance` |

## Objective
Teacher self check-in/out widget (API validates branch IP whitelist) and the admin browse/correction surface.

## Screens / Components
- **Teacher view**: a check-in / check-out widget showing today's status + times; history via `GET /me/teacher-attendance`. On IP-whitelist rejection, render the API's error clearly (e.g. "check-in not allowed from this network") — never mask it.
- **Admin view**: paginated teacher-attendance table (`GET /teacher-attendance`) with date + teacher filters; view/correct a record via `PUT /teacher-attendance/{id}` (records `corrected_by` server-side).

## Behavior
- IP validation entirely server-side; UI only triggers and surfaces results.
- Correction dialog with confirmation; success toast; cache invalidation.

## Rules
- Permission-gated; super admin sees all branches.

## Check When Done
- [x] Teacher can check in/out and see today's status; IP-rejected check-in shows the API's reason.
- [x] Admin can list, filter, and correct teacher attendance.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
