# Task F-2.5 — Public Admission Form & Status Check

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `todo` |
| Depends on | 1.1, 1.3 |
| Blocks | — |
| Feature spec | `feature-specs/08-admissions.md` |
| Contract | `docs/api/admissions.md` |
| Endpoints | `POST /public/admissions` (public, multipart), `GET /public/admissions/{application_no}/status`, `GET /public/settings` |

## Objective
The unauthenticated, standalone admission experience: a multi-step application form and an application-status lookup. No app shell, no token.

## Screens / Components
- **Public form** (standalone branded layout): multi-step — branch + class selection (from `GET /public/settings` / public class data per contract), personal info (bilingual fields), guardian info, photo + document uploads. RHF + Zod, multipart submit. A **success screen** shows the returned `application_no`.
- **Status check**: enter `application_no` → `GET /public/admissions/{application_no}/status`; render current status badge.

## Behavior
- Upload validation (type/size) surfaced inline; `422` maps to step fields and focuses the first invalid field.
- No token, no app shell; sends only the documented fields (selected branch field, not arbitrary `branch_id`).

## Rules
- Public form sends no auth; approval/rejection logic is entirely server-side.

## Check When Done
- [ ] Visitor completes multi-step form with uploads and sees confirmation + `application_no`.
- [ ] Status check returns and renders the application status.
- [ ] Upload + field validation states present; responsive at 360/768/≥1280px.
- [ ] `npm run build` passes.
