# Task F-6.4 — Settings: Global (Identity, Session, Credentials, Grading Scale, Toggles)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `done` |
| Depends on | 1.5, 2.1 |
| Blocks | 5.3 (partial-payment toggle), 4.2 (grading scale) |
| Feature spec | `feature-specs/19-settings.md` |
| Contract | `docs/api/settings.md` |
| Endpoints | `GET /settings`, `PUT /settings`, `GET /grading-scales`, `PUT /grading-scales`, `GET /public/settings` |

## Objective
Global configuration: school identity, academic session, grading-scale editor, payment-gateway / notification credentials, and feature toggles.

## Screens / Components
Implement this design by using react and shadcn following our architecture.
Design file: `design/project/Settings.dc.html`

## Behavior
- RHF + Zod; `422` → fields; success toast; invalidate settings + grading-scale + public-settings caches on write.

## Rules
- Editing the grading scale never retroactively changes past results (API-enforced) — the UI just edits the scale.
- Never display raw secrets the API doesn't return; respect masking/write-only.
- Cache settings; invalidate on write.

## Check When Done
- [x] Global settings viewed and (with permission) updated; logo upload works.
- [x] Grading scale saves; feature toggles propagate (partial-payment availability in fees).
- [x] Credentials handled masked/write-only; loading/error/validation states present.
- [ ] `npm run build` passes. In this sandbox, Next's production build still stops before app compilation because `next/font` cannot fetch Google Fonts over the blocked network.
