# Task F-4.3 — Results (Search, View, Self) + Generate/Publish

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `todo` |
| Depends on | 4.2 |
| Blocks | 4.4 |
| Feature spec | `feature-specs/13-results.md` |
| Contract | `docs/api/results.md` |
| Endpoints | `GET /results/search`, `GET /exams/{exam}/results`, `GET /enrollments/{id}/results`, `GET /me/results`, `POST /exams/{exam}/results/generate`, `POST /exams/{exam}/results/publish`, `POST /annual-results/generate`, `POST /annual-results/publish` |

## Objective
View per-exam and weighted annual results, search students, and (with permission) generate/publish results.

## Screens / Components
- **Result search** (permitted): search any student → per-exam results + annual result (`GET /results/search`, `GET /enrollments/{id}/results`).
- **Result view**: subject marks, grades, per-exam GPA, **annual GPA** (API computes 25% S1 + 25% S2 + 50% final), pass/fail verdict (an F in any subject fails — reflect the API's verdict). Display only.
- **Self view**: students/parents see own / children's results (`GET /me/results`); parent child selector.
- **Generate / Publish** actions (permission-gated): `POST /exams/{exam}/results/generate|publish`, `POST /annual-results/generate|publish`, each with confirmation. Published results are immutable → present read-only.

## Rules
- All computation server-side; the client displays returned values + the API's pass/fail verdict.
- GPA/grades: tabular figures, two decimals (`ui-context.md`).

## Check When Done
- [ ] Permitted user can search/view any student's results; students/parents see only their own.
- [ ] Annual result + pass/fail reflect the API exactly; generate/publish work with confirmation.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
