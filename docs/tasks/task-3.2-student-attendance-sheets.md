# Task F-3.2 — Attendance Sheets (Class & Per-Student / Self)

| Field | Value |
|---|---|
| Phase | 3 — Attendance |
| Status | `done` |
| Depends on | 3.1 |
| Blocks | — |
| Feature spec | `feature-specs/10-student-attendance.md` |
| Contract | `docs/api/student-attendance.md` |
| Endpoints | `GET /attendance`, `GET /attendance/sheet`, `GET /students/{id}/attendance`, `GET /me/attendance` |

## Objective
Read views of attendance: a class/section monthly sheet for staff, and a per-student monthly sheet for staff plus students/parents (own / children).

## Screens / Components
- **Class sheet**: month/date view (`GET /attendance/sheet` or `GET /attendance`) with status badges per day; export if the contract provides it. Class students monthly attendance, this will be a table first left column should be student name, rest of right side will be full month date, coulmn will be the attendance status (present/absent/late/leave) every date 

- **Student monthly sheet**: calendar/table of one student's month (`GET /students/{id}/attendance`); will be mothly full attendance list, summary counts (present/absent/late/leave).
- **Self view** (student): `GET /me/attendance`. **Parent view**: child selector switching among linked students.

## Behavior
- Record-level access enforced by API; render access/not-found state on `403/404`.
- Month navigation; loading skeleton matching the calendar/table.

## Rules
- Display API values; no client-side recomputation of totals beyond what the API returns.

## Check When Done
- [x] Class and per-student monthly sheets render with status badges + counts.
- [x] Student self-view and parent child-switch work.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
