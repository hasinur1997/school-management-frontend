# Task F-6.2 — Transfer Certificates (Issue, List, PDF)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `todo` |
| Depends on | 2.7 |
| Blocks | — |
| Feature spec | `feature-specs/17-documents.md` |
| Contract | `docs/api/documents.md` |
| Endpoints | `POST /students/{id}/tc`, `GET /tcs`, `GET /tcs/{tc}`, `GET /tcs/{tc}/pdf` |

## Objective
Issue transfer certificates (sets student status to TC), list issued TCs, and download the stored TC PDF.

## Screens / Components
- **Issue** action on a student (permission-gated, **explicit confirmation** — irreversible status change to TC) → `POST /students/{id}/tc`; reflect the student's new TC status in their profile/lists; download the returned TC PDF.
- **TC list**: paginated `GET /tcs`; detail `GET /tcs/{tc}`; the TC is the one stored PDF → surface its link (`GET /tcs/{tc}/pdf`) from the profile thereafter.

## Behavior
- Issuing a TC excludes the student from attendance/invoicing/promotion (API-enforced) — reflect status, don't special-case.
- Success toast; invalidate student + TC caches.

## Rules
- TC issuance is irreversible status-wise — require explicit confirmation. PDFs streamed by the API.

## Check When Done
- [ ] Issuing a TC updates the student's status, downloads the TC PDF, and exposes the stored document link.
- [ ] TC list + detail render; confirmation required before issuance.
- [ ] Loading/error states present.
- [ ] `npm run build` passes.
