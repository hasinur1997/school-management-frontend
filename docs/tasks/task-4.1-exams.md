# Task F-4.1 — Exams (List, Create/Edit)

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `todo` |
| Depends on | 2.1 |
| Blocks | 4.2, 4.3 |
| Feature spec | `feature-specs/12-exams-marks.md` |
| Contract | `docs/api/exams-marks.md` |
| Endpoints | `GET /exams`, `GET /exams/{id}`, `POST /exams`, `PUT /exams/{id}` |

## Objective
Manage exams (first semester / second semester / final) per session/class.

## Screens / Components
- **List**: paginated exams table (name, type/term, session, class, date range, status). Filters by session/class/type.
- **Create/Edit form**: type (semester1 | semester2 | final enum), session, class, schedule fields per contract.

## Behavior
- RHF + Zod; `422` → fields; success toast + list refresh.
- Exam type drives downstream weighting (25% S1 + 25% S2 + 50% final) — computed server-side; the form only sets the type.

## Rules
- Permission-gated; super admin sees all branches.

## Check When Done
- [ ] Exams listed, filtered, created, and edited.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
