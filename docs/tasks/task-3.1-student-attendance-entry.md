# Task F-3.1 — Student Attendance Entry

| Field | Value |
|---|---|
| Phase | 3 — Attendance |
| Status | `done` |
| Depends on | 2.1, 2.7 |
| Blocks | — |
| Feature spec | `feature-specs/10-student-attendance.md` |
| Contract | `docs/api/student-attendance.md` |
| Endpoints | `GET /attendance/sheet`, `POST /attendance`, `PUT /attendance/{id}` |

## Objective
Daily roster entry screen for permitted teachers/staff to record/update attendance per class/section/date.

## Screens / Components
- Pick class + section + date via shared selectors (2.1).
- Load the roster from `GET /attendance/sheet`; each student gets a segmented status control: **present / absent / late / leave**.
- "Mark all present" bulk helper.
- Submit bulk via `POST /attendance`; if a record exists for the date, the API returns it — load and update rather than duplicate.

## Behavior
- One-record-per-student-per-day is enforced by the API — re-entering an existing date edits, never duplicates; surface the API's `422`/conflict messages.
- TC students are excluded by the API and won't appear in the roster — don't filter client-side.
- Submit shows loading; success toast; per-row error mapping on `422`.

## Rules
- Don't enforce once-per-day or TC-exclusion client-side; surface API results.

## Check When Done
- [x] Teacher loads a roster and records/updates daily attendance.
- [x] Re-entering an existing date edits rather than duplicates.
- [x] Loading/empty/error states present; responsive at 360/768/≥1280px.
- [x] `npm run build` passes.
