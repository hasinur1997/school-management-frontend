# Task F-4.2 — Mark Entry Grid

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `done` |
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

## Design update — Multi-Subject Mark Entry

Reworked to the imported "Multi-Subject Mark Entry" design: enter **every subject of a class/section in one grid** (Matrix view) plus a dense **By subject** view, sharing one draft. Search is by **roll or name**. Added full-stack support for what the design needs:

- **Matrix read**: `GET /exams/{id}/marks/matrix?class_id=&section_id=` — scoped by **class** (must be one the exam covers); **section is optional** (omit to load the whole class, all sections). Returns all subject columns + roster, each cell `{ obtained_marks, is_absent }`.
- **Absent**: new `is_absent` column on `marks` (absent = stored as 0 + flag); accepted by `POST /exams/{id}/marks` and surfaced on the sheet/matrix.
- **Publish/lock**: `POST /exams/{id}/marks/publish` (→ published, freezes edits) and `/unpublish` (→ completed). Authoritative result generation stays task 4.3.
- **Stats / Total / GPA / Result**: client-side **previews** aggregated from server-resolved grade points; grades themselves remain server-owned (`resolveGrade` mirrors the API scale). The client never invents grades.

## Check When Done
- [x] Teacher selects exam/class/section/subject, loads grid, submits marks in bulk.
- [x] Existing marks load for editing; per-row `422` errors surface; grades/points shown are the API's.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
