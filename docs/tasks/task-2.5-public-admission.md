# Task F-2.5 — Public Admission Application Form

| Field | Value |
|---|---|
| Phase | 2 — Academic & People |
| Status | `done` |
| Depends on | 1.1, 1.3 |
| Blocks | — |
| Feature spec | `feature-specs/08-admissions.md` |
| Contract | `docs/api/admissions.md` |
| Route | `/admissions/application` |
| Submit endpoint | `POST {base_url}/api/v1/public/admissions` (multipart/form-data) |
| Settings endpoint | `GET {base_url}/api/v1/public/settings` (branches, classes, admission payment flag, payment retry limit) |
| Status endpoint | `GET {base_url}/api/v1/public/admissions/{application_no}/status` |
| Payment-initiate endpoint | `POST {base_url}/api/v1/invoices/{invoice_id}/payments/online` (public, no auth required) |

## Objective
Standalone, unauthenticated, multi-step admission application form. No app shell, no token. Fully separate visual design — light theme, shadcn/ui.

## Scope note
General status-check page (manual applicant lookup) is a **separate ticket**. This ticket only uses the status endpoint internally, for the post-payment confirmation screen.

## Wizard Steps
1. **Branch & Class** — `branch_id`, `desired_class_id` (from `/public/settings`, class filtered by branch)
2. **Student Identity** — `name_bn/en`, `date_of_birth`, `birth_reg_no`, `religion` (free text), `nationality` (locked, default "Bangladeshi"), `caste` (optional)
3. **Guardian Info** — father (`name_bn/en`, `nid` optional, `mobile` required), mother (`name_bn/en`, `nid` optional, `mobile` optional)
4. **Address** — present address (single-language, required) + permanent address (bn/en pairs, all required)
5. **Previous Education** *(optional)* — one row shown by default, not required to fill; ➕ Add another / 🗑 Remove row for additional entries
6. **Photo & Documents** — photo (required, jpg/jpeg/png, ≤2MB), documents (optional, up to 5, pdf/jpg/jpeg/png, ≤5MB each)
7. **Preview** — read-only summary (branch/class by name, photo thumbnail, document filenames); **Edit** returns to step 1 with all data retained
8. **Submit** → creates application, returns `application_no` (+ `invoice_id` if payment enabled)
9. **Payment** *(only if enabled per settings)* → call `POST /invoices/{invoice_id}/payments/online` → redirect to SSLCommerz → return to "Confirming payment…" screen that fetches `GET .../status` (never trusts redirect query params) → renders true status
10. **Confirmation** — shows `application_no`, final status, **Download PDF** (server-generated, includes logo/photo/branch/all fields)

## Field Specification

| Field | Required | Rule |
|---|---|---|
| `name_bn` / `name_en` | ✅ | string, max 150 |
| `father_name_bn` / `father_name_en` | ✅ | string, max 150 |
| `father_nid` | optional | string, max 20 |
| `mother_name_bn` / `mother_name_en` | ✅ | string, max 150 |
| `mother_nid` | optional | string, max 20 |
| `present_village/post_office/upazila/district` | ✅ | string, max 100, no bn/en split |
| `father_mobile` | ✅ | string, max 20 |
| `permanent_village/post_office/upazila/district` (`_bn`) | ✅ | string, max 100 |
| `mother_mobile` | optional | string, max 20 |
| `permanent_village/post_office/upazila/district` (`_en`) | ✅ | string, max 100 |
| `birth_reg_no` | ✅ | string, max 25, unique — duplicate shows inline "already registered" error |
| `date_of_birth` | ✅ | valid date |
| `religion` | ✅ | free text, max 50 |
| `nationality` | optional | max 50, default "Bangladeshi", field locked/disabled |
| `caste` | optional | max 50 |
| `branch_id` | ✅ | must exist + active |
| `desired_class_id` | ✅ | must exist + active + belong to selected branch (re-validate/reset on branch change) |
| `photo` | ✅ | file, jpg/jpeg/png, max 2MB |
| `documents[]` | optional | up to 5 files, pdf/jpg/jpeg/png, max 5MB each |
| `previous_educations[]` | optional | array, default one empty optional row |
| `previous_educations[].exam_name` | required if row filled | max 100 |
| `previous_educations[].institution_name` | required if row filled | max 150 |
| `previous_educations[].gpa` | optional | numeric 0–5 |
| `previous_educations[].passing_year` | optional | 4-digit integer |
| `previous_educations[].board_roll` | optional | max 30 |
| `previous_educations[].board_reg_no` | optional | max 30 |

All required fields show a red `*` next to the label.

## Payment Flow Detail
- Application created first; if payment enabled, backend also creates an invoice and returns `invoice_id` in the submit response.
- Frontend calls `POST /invoices/{invoice_id}/payments/online` (public, no auth) to start the SSLCommerz session, then redirects.
- On return, frontend never trusts redirect query params — always re-fetches authoritative status via `GET /public/admissions/{application_no}/status`.
- On `payment_failed`/`payment_abandoned`: show **Retry Payment**, re-initiating against the same `invoice_id`.
- Retry capped at N attempts — configurable via settings, default 3.
- After N attempts: status shown as `payment_failed`, retry hidden, messaging that the school office will follow up; resolution happens from the admin panel (out of scope here).
- If payment disabled in settings: skip straight from Submit to Confirmation, no payment status shown.

## Behavior
- RHF + Zod, per-step validation; can't advance with invalid fields in current step.
- Step indicator with back navigation that preserves data.
- `422` errors map to the relevant field and jump the wizard to the first step containing one.
- Duplicate `birth_reg_no` → inline "already registered" message on Student Identity step.
- Upload errors (type/size) shown inline on the Photo & Documents step.
- No auth token sent; only documented fields submitted.

## Design
- Fully standalone layout, light theme, shadcn/ui — visually distinct from the dashboard shell.
- Responsive at 360 / 768 / ≥1280px.

## Check When Done
- [x] All required fields show `*`; validation matches backend rules exactly.
- [x] Wizard blocks forward navigation on invalid step data.
- [x] Previous education: default single optional row + working add/remove.
- [x] Preview accurately reflects all entered data incl. photo/documents; Edit returns to wizard intact.
- [x] Submit creates application, returns `application_no` (and `invoice_id` if applicable).
- [x] Payment flow (if enabled): initiate → redirect → status re-fetch (not redirect params) → retry up to settings-configured N (default 3) → `payment_failed` terminal state.
- [x] Confirmation screen shows status + working PDF download (logo, photo, branch, all fields).
- [x] Duplicate `birth_reg_no` → clear inline 422 error on correct step.
- [x] Responsive at 360/768/≥1280px.
- [x] `npm run build` passes.