# 07 — Teachers

Teacher management: list, profile, create with assignments, credential dispatch, active/inactive. Contract: `docs/api/teachers.md`.

## Endpoints consumed

- `POST /teachers` → create teacher (API generates and sends credentials).
- Teacher list / detail / update / status endpoints per the contract.

## Implementation

- Teachers list page: paginated table (name, subjects, assigned classes, status badge, branch for super admin), search + status filter.
- Create/edit form: personal info, subject and class assignments (using the shared selectors from 06), active/inactive toggle. On create, surface the API's confirmation that credentials were dispatched.
- Detail page: profile, assignments, attendance summary link.
- Status toggle (active/inactive) with confirmation.

## Rules

- All gated by the documented teacher permissions; super admin sees all branches.
- Credentials are generated and sent by the API — never construct or display passwords client-side beyond what the API returns.

## Check When Done

- Teachers can be listed, filtered, created (with assignments), edited, and toggled active/inactive.
- 422 validation maps to fields; success shows a toast and refreshes the list.
- Loading/empty/error states present.
- `npm run build` passes.
