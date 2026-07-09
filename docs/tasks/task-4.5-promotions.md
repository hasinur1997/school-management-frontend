# Task F-4.5 — Promotion (Preview, Bulk, Individual)

| Field | Value |
|---|---|
| Phase | 4 — Exams, Results, Promotion |
| Status | `done` |
| Depends on | 4.3 |
| Blocks | — |
| Feature spec | `feature-specs/14-promotions.md` |
| Contract | `docs/api/promotions.md` |
| Endpoints | `GET /promotions/preview`, `GET /promotions`, `POST /promotions/bulk`, `POST /promotions/individual` |

## Objective
Preview eligible vs held students for a class/session and promote in bulk or individually.

## Screens / Components
- **Promotion screen**: select source class + session → `GET /promotions/preview` showing passed (eligible) vs failed/held students with clear counts.
- **Bulk promote**: one action → confirmation summarizing how many move and to which class/session → `POST /promotions/bulk`; on success refresh preview + student lists.
- **Individual**: promote or hold a single student from the preview table → `POST /promotions/individual` (override permission per contract).
- **History**: `GET /promotions` list of past promotion runs.

## Behavior
- Failed students repeat; TC students excluded by API — reflect from the preview, don't decide client-side.

## Rules
- Eligibility + target are server-determined; the client previews, confirms, triggers.
- Permission-gated; individual override requires its documented permission.

## Check When Done
- [ ] Preview lists eligible vs held per the API; counts clear.
- [ ] Bulk promotion confirms then promotes exactly the API-reported set; individual promote/hold works.
- [ ] Loading/empty/error states present.
- [ ] `npm run build` passes.
