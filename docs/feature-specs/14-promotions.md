# 14 — Promotion

Bulk and individual student promotion with a preview. Contract: `docs/api/promotions.md`.

## Endpoints consumed

- `GET /promotions/preview` → who would be promoted/held for a class/session.
- `POST /promotions/bulk` → promote all passed students of a class to the next class/session.
- `POST /promotions/individual` → promote or hold a specific student.

## Implementation

- **Promotion screen**: select source class/session; fetch the preview showing passed (eligible) vs failed/held students. Show counts clearly.
- **Bulk promote**: one action with a confirmation summarizing how many move and to which class/session; on success, refresh the preview and student lists.
- **Individual**: promote or hold a single student from the preview table.
- Failed students repeat the class; TC students are excluded by the API. Reflect both from the preview, don't decide client-side.

## Rules

- Eligibility and the promotion target are server-determined; the client only previews, confirms, and triggers.
- Permission-gated.

## Check When Done

- The preview correctly lists eligible vs held students per the API.
- Bulk promotion confirms then promotes exactly the API-reported set.
- Individual promote/hold works and updates the preview.
- Loading/empty/error states present.
- `npm run build` passes.
