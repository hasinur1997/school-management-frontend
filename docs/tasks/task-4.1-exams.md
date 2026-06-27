# Task F-4.1 — Exams (List, Create/Edit)

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `done` |
| Depends on | 2.1 |
| Blocks | 4.2, 4.3 |
| Feature spec | `feature-specs/12-exams-marks.md` |
| Contract | `docs/api/exams-marks.md` |
| Endpoints | `GET /exams`, `GET /exams/{id}`, `POST /exams`, `PUT /exams/{id}`, `DELETE /exams/{id}`, `POST /exams/bulk-delete` |

## Objective
Manage exams (first semester / second semester / final) per session/class.

## Screens / Components
- **List**: paginated exams table (name, type/term, session, **classes**, date range, status). Filters by session/class/type. The classes column shows "All classes" or the targeted class names.
- **Create/Edit form**: type (semester1 | semester2 | final enum), session, **class targeting (multiple classes, or all classes)**, schedule fields per contract.

> **Updated scope:** an exam targets **multiple classes or all classes** (not a single class) — `all_classes` flag + `exam_class` pivot (`class_ids` / `classes`). Session/type stay single; no section binding. Identity (session/classes/type) is immutable on edit, but **every exam is editable** (name/dates/status; a published exam keeps its terminal status). Exams can be **deleted** (single + **bulk**); delete cascades the exam's marks/results and the class pivot.

## Behavior
- RHF + Zod; `422` → fields; success toast + list refresh.
- Exam type drives downstream weighting (25% S1 + 25% S2 + 50% final) — computed server-side; the form only sets the type.

## Rules
- Permission-gated; super admin sees all branches.

## Check When Done
- [x] Exams listed, filtered, created, and edited.
- [x] Loading/empty/error states present.
- [x] `npm run build` passes.
