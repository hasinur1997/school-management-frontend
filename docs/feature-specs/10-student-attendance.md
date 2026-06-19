# 10 — Student Attendance

Daily attendance entry and monthly attendance sheets. Contract: `docs/api/student-attendance.md`.

## Endpoints consumed

- `POST /attendance` → record/update daily attendance for a class/section (statuses: present, absent, late, leave).
- `GET /attendance/sheet` → class/section sheet for a date or month.
- `GET /students/{id}/attendance` → a single student's monthly sheet (self/children for student/parent).

## Implementation

- **Entry screen** (teacher/permitted): pick class, section, and date via shared selectors; load the roster; set each student's status with a segmented control; bulk "mark all present" helper; submit. Reflect the API's one-record-per-student-per-day rule — if a record exists for the date, load and update it rather than duplicating.
- **Class sheet**: month/date view of attendance with status badges; export if the contract provides it.
- **Student monthly sheet**: calendar/table of a student's month — used by students and parents for their own/children's records (selectable child for parents).
- TC students are excluded by the API; they won't appear in the roster.

## Rules

- Do not enforce the once-per-day or TC-exclusion rules client-side — surface what the API returns; show its `422`/conflict messages.

## Check When Done

- A teacher can load a roster and record/update daily attendance.
- Re-entering an existing date edits rather than duplicates.
- Class and per-student monthly sheets render; parent can switch among children.
- Loading/empty/error states present.
- `npm run build` passes.
