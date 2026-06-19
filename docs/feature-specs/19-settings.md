# 19 — Settings

Global and per-branch configuration surfaces. Contract: `docs/api/settings.md`.

## Endpoints consumed

- Settings read/update endpoints (see "Known setting keys" in the contract).
- Branch settings: branch info, check-in IP whitelist, class fee amounts.
- Grading-scale read/update (also consumed read-only by exams/results).
- Feature toggles (e.g. partial payments).

## Implementation

- **Global settings** (permission-gated): school identity (name, logo upload), academic session selection, grading scale editor, SSLCommerz and notification credentials (write-only / masked where the API masks them).
- **Per-branch settings**: branch info; **check-in IP whitelist** manager (add/remove IPs used by teacher attendance); **class fee amounts** per class.
- **Feature toggles**: e.g. partial payments — read by the fees module to decide whether partial entry is offered.
- Grouped sections (tabs) for global vs branch; super admin can manage any branch, branch admins only their own (API-enforced).

## Rules

- Editing the grading scale must not retroactively change past results — that's enforced by the API; the UI just edits the scale.
- Credentials/secrets are handled per the contract (masked/write-only); never display raw secrets the API doesn't return.
- Cache settings and invalidate on write.

## Check When Done

- Global and per-branch settings can be viewed and (with permission) updated.
- IP whitelist and class fee amounts can be managed.
- Grading scale edits save; feature toggles propagate (e.g. partial-payment availability in fees).
- Loading/error and validation states present.
- `npm run build` passes.
