# 12 — Exams & Mark Entry

Exam selection and subject-wise mark entry per student per exam. Contract: `docs/api/exams-marks.md`.

## Endpoints consumed

- `GET /exams/{id}/marks/sheet` → the mark-entry grid for an exam/class/subject.
- `POST /exams/{id}/marks` → submit/update marks (bulk).
- Exam list and grading-scale read endpoints per the contract.

## Implementation

- **Mark entry**: select exam (first semester / second semester / final), class, section, and subject via shared selectors; load the student grid from the marks sheet; enter marks per student; submit in bulk. Show the resulting grade/grade-point the API maps from the grading scale (read-only — the client does not compute grades).
- Validation against the subject's max marks comes from the API's `422`; map it to the relevant rows.
- Re-loading an exam/subject shows previously entered marks for editing.

## Rules

- The grading scale and grade mapping are server-owned; never compute grades or GPA on the client.
- Permission-gated.

## Check When Done

- A teacher can select exam/class/section/subject, load the grid, and submit marks in bulk.
- Existing marks load for editing; per-row validation errors surface.
- Grades/points shown are those the API returns.
- Loading/empty/error states present.
- `npm run build` passes.
