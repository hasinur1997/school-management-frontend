# Task F-6.2 — Transfer Certificates (Issue, List, PDF)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `done` |
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

- TC design:  "Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project:
https://claude.ai/design/p/97bd3e51-a039-4b4c-9b8b-b7211616543d?file=Transfer+Certificate.dc.html

Implement: Implement tc design exactly"

## Behavior
- Issuing a TC excludes the student from attendance/invoicing/promotion (API-enforced) — reflect status, don't special-case.
- Success toast; invalidate student + TC caches.

## Rules
- TC issuance is irreversible status-wise — require explicit confirmation. PDFs streamed by the API.

## Check When Done
- [x] Issuing a TC updates the student's status, downloads the TC PDF, and exposes the stored document link.
- [x] TC list + detail render; confirmation required before issuance.
- [x] Loading/error states present.
- [x] `npm run build` passes.

> **Design:** the imported "Transfer Certificate" Claude Design (project `97bd3e51…`, `Transfer Certificate.dc.html`) is implemented **exactly** as a client-rendered, pixel-faithful paper (`components/documents/tc-paper.tsx`, fixed-palette A4 794×1123, Geist / Geist Mono / Noto Sans Bengali) shown as a live preview and downloaded / printed as a client PDF via the shared `components/invoices/paper-pdf.ts` exporter — mirroring the ID-card follow-up. The detail screen and the student's TC tab both render it (`tc-certificate-view.tsx`). Fields the data model doesn't track (general conduct, last exam, promoted-to class) render as the em-dash marker rather than being invented; DOB / admission date come from the full student profile (fetched alongside the TC, since the TC's embedded student summary omits them). Verified the layout against the design via headless-Chrome screenshot.
