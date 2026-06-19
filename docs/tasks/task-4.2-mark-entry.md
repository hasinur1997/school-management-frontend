# Task F-4.2 — Mark Entry Grid

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `todo` |
| Depends on | 4.1 |
| Blocks | 4.3 |
| Feature spec | `feature-specs/12-exams-marks.md` |
| Contract | `docs/api/exams-marks.md` |
| Endpoints | `GET /exams/{id}/marks/sheet`, `GET /exams/{id}/marks`, `POST /exams/{id}/marks`, `GET /grading-scales` |

## Objective
Subject-wise bulk mark entry per student per exam, showing API-mapped grades read-only.

## Screens / Components
- Select exam + class + section + subject (shared selectors).
- Load the student grid from `GET /exams/{id}/marks/sheet`; enter marks per student.
- Show the resulting **grade / grade-point** the API maps from `GET /grading-scales` — **read-only; the client never computes grades or GPA**.
- Submit in bulk via `POST /exams/{id}/marks`.

## Behavior
- Re-loading an exam/subject shows previously entered marks for editing.
- Per-row validation: marks > subject max → API `422` mapped to the relevant rows.
- Bulk submit shows progress/loading; success toast.

## Rules
- Grading scale + grade mapping are server-owned; never compute on the client.
- Permission-gated.

## Check When Done
- [ ] Teacher selects exam/class/section/subject, loads grid, submits marks in bulk.
- [ ] Existing marks load for editing; per-row `422` errors surface; grades/points shown are the API's.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
