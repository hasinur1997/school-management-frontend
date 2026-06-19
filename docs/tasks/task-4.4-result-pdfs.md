# Task F-4.4 — Result-Sheet PDF Download

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `todo` (blocked) |
| Depends on | 4.3; **backend task 8.4 (marksheet PDFs) — not yet implemented** |
| Blocks | — |
| Feature spec | `feature-specs/13-results.md` |
| Contract | `docs/api/results.md` |
| Endpoints | per-exam + annual marksheet PDF endpoints (stream `application/pdf`) — **to be exposed by backend 8.4** |

## Objective
Trigger and download the result-sheet PDFs (per-exam and annual) as streamed files.

> ⚠️ **Dependency:** backend ticket 8.4 (Marksheet PDFs via dompdf) is the only unfinished backend task and no PDF route exists yet. Do not start until the backend exposes the documented endpoint; until then, hide/disable the download action behind the missing permission/route.

## Screens / Components
- A **Download** action on the result view (per-exam and annual) that requests the PDF stream and saves it as a file (blob download with the API's filename). Never render PDFs client-side.
- Loading state on the trigger button; error toast on failure.

## Rules
- PDFs are streamed by the API; the client only triggers and downloads.

## Check When Done
- [ ] Backend 8.4 endpoint confirmed live.
- [ ] Result-sheet PDF (per-exam + annual) downloads as a streamed file.
- [ ] Loading/error states present.
- [ ] `npm run build` passes.
