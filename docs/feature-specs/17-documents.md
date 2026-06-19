# 17 — Documents (ID Cards & Transfer Certificates)

Generate ID cards and issue transfer certificates as PDFs. Contract: `docs/api/documents.md`.

## Endpoints consumed

- `POST /id-cards/batch` → generate ID cards for a class (batch); single-student ID card endpoint per the contract. Streams `application/pdf`.
- `POST /students/{id}/tc` → issue a transfer certificate (sets the student status to TC, returns/streams the TC PDF).

## Implementation

- **ID cards**: from a student detail page (single) or a class view (batch) — trigger generation and download the streamed PDF. Show the card contents the API documents (photo, name, ID, class, branch, session, validity).
- **Transfer certificate**: an issue action on a student (permission-gated, confirmation required since it changes status to TC). After issuing, reflect the student's new TC status in their profile and lists; download the TC PDF. The TC document is the one stored PDF — surface its link from the profile thereafter.
- Issuing a TC excludes the student from attendance/invoicing/promotion (enforced by the API) — reflect the status, don't special-case.

## Rules

- PDFs are streamed by the API; the client only triggers and downloads them.
- TC issuance is irreversible status-wise — require explicit confirmation.

## Check When Done

- Single and batch ID cards download as streamed PDFs.
- Issuing a TC updates the student's status, downloads the TC PDF, and exposes the stored document link.
- Confirmation required before TC issuance.
- Loading/error states present.
- `npm run build` passes.
