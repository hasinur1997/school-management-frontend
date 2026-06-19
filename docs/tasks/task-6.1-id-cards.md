# Task F-6.1 — ID Cards (Single & Batch)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `todo` |
| Depends on | 2.7 |
| Blocks | — |
| Feature spec | `feature-specs/17-documents.md` |
| Contract | `docs/api/documents.md` |
| Endpoints | `GET /students/{id}/id-card`, `POST /id-cards/batch`, `GET /id-cards/batch/{batch}`, `GET /id-cards/batch/{batch}/download` |

## Objective
Generate and download student ID cards — single (streamed) and class batch (queued job + poll + download).

## Screens / Components
- **Single**: from a student detail page, trigger `GET /students/{id}/id-card` and download the streamed PDF.
- **Batch**: from a class view, `POST /id-cards/batch` (returns a batch id, `202`); **poll** `GET /id-cards/batch/{batch}` for status (processing/done) with progress UI; when done, download via `GET /id-cards/batch/{batch}/download`.

## Behavior
- Poll with backoff while processing; show a progress indicator; surface failure clearly.
- PDFs streamed by the API; client only triggers + downloads (blob with API filename).

## Rules
- Permission-gated. Don't render PDFs client-side.

## Check When Done
- [ ] Single ID card downloads as a streamed PDF.
- [ ] Batch generates, polls to done, and downloads the merged PDF; progress + error states present.
- [ ] `npm run build` passes.
