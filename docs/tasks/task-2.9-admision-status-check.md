# Task F-2.9 — Public Admission Application Status Check

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 1.1, 1.3, F-2.5 |
| Blocks | — |
| Feature spec | `feature-specs/08-admissions.md` |
| Contract | `docs/api/admissions.md` |
| Route | `/admissions/status` |
| Endpoint | `GET {base_url}/api/v1/public/admissions/{application_no}/status?date_of_birth=YYYY-MM-DD` |
| Design | https://claude.ai/design/p/6abf891c-d978-49ed-8303-6423c782e0e3?file=Admission+Status+Check.dc.html |

## Objective
Standalone, unauthenticated page for an applicant to look up their submitted admission application using `application_no` + `date_of_birth`. No app shell, no token. Same visual treatment as F-2.5 (light theme, shadcn/ui, separate from dashboard).

## Screens
1. **Lookup form** — two fields + "Check Status" button.
2. **Result — found** — applicant card showing photo + details + status badge.
3. **Result — not found** — friendly empty state, "Try Again" returns to lookup with previous inputs cleared.

## Lookup Form
| Field | Required | Notes |
|---|---|---|
| `application_no` | ✅ | text input, trimmed; case-sensitive per backend |
| `date_of_birth` | ✅ | date picker, format `YYYY-MM-DD` for API |

- Both fields required; client-side validation before submit (no point hitting the API with missing data).
- Submit button disabled until both fields have values; loading state during the GET call.
- Red `*` on labels.

## Result — Found
Display these fields from the API response:

| Field | Display |
|---|---|
| Photo | Avatar/image, prominent placement |
| Student name (Bangla) | `name_bn` |
| Student name (English) | `name_en` |
| Date of birth | `date_of_birth`, formatted (e.g., "10 Jan 2015") |
| Birth registration no | `birth_reg_no` |
| Religion | `religion` |
| Nationality | `nationality` |
| Branch | branch name (not ID) |
| Class | desired class name (not ID) |
| Session | academic session label |
| Status | **prominent badge** — color-coded by value |

**Status badge colors** (confirm full enum against backend):
- `submitted` / `under_review` — neutral/info (blue/gray)
- `approved` — success (green)
- `rejected` — destructive (red)
- `payment_pending` / `payment_failed` — warning (amber)
- Unknown values fall back to a neutral default

## Result — Not Found
- Single, calm empty-state screen — no "DOB doesn't match" or "no such application" distinction (security: backend returns the same response for both, do not infer which).
- Message: "We couldn't find an application matching those details. Please check your application number and date of birth and try again."
- **Try Again** button → returns to lookup form (cleared).

## Behavior
- `GET` is called only on form submit, not on input change.
- 404 (or backend's documented "not found" response) → not-found screen.
- Network/5xx errors → toast or inline message, "Something went wrong. Please try again." — does NOT route to the not-found screen (those are different failure modes).
- No auth token sent.
- Photo URL: if relative, prefix with API base URL.
- Browser back from result screen returns to lookup with previous inputs preserved (so user can correct a typo without re-typing both).

## Design
- Standalone layout (no app shell), light theme, shadcn/ui.
- Visually consistent with F-2.5 public form.
- Responsive at 360 / 768 / ≥1280px.
- Final design to be handed off via Claude Design.


## Check When Done
- [x] Lookup form validates both required fields; submit disabled until valid.
- [x] Successful lookup renders all listed fields + status badge in correct color.
- [x] Not-found state shows generic empty state (not distinguishing failure cause).
- [x] Network/5xx errors handled separately from not-found.
- [x] Photo renders correctly (handling absolute vs relative URL).
- [x] Back navigation from result preserves inputs for correction.
- [x] Responsive at 360/768/≥1280px.
- [x] `npm run build` passes.