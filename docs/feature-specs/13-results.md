# 13 — Results

Per-exam and weighted annual result views, search, and result-sheet PDF. Contract: `docs/api/results.md`.

## Endpoints consumed

- Result search / per-student result endpoints (per-exam GPA and annual result).
- Result-sheet PDF endpoint (streams `application/pdf`).

## Implementation

- **Result search** (permitted users): search any student and view their per-exam results and the annual result (the API computes 25% S1 + 25% S2 + 50% final — display only).
- **Result view**: subject marks, grades, per-exam GPA, annual GPA, pass/fail (an F in any subject fails that exam — reflect the API's verdict).
- **Self view**: students/parents see their own / children's results only.
- **Download**: trigger the result-sheet PDF stream as a file download — never render PDFs client-side.
- Published results are immutable; the UI presents them as read-only.

## Rules

- All computation is server-side; the client displays returned values and the API's pass/fail verdict.
- Money/GPA formatting per `ui-context.md` (tabular, two decimals).

## Check When Done

- A permitted user can search and view any student's results; students/parents see only their own.
- Annual result and pass/fail reflect the API exactly.
- Result-sheet PDF downloads as a streamed file.
- Loading/empty/error states present.
- `npm run build` passes.
