# Task F-6.5 — Settings: Per-Branch (Info, IP Whitelist, Class Fees)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `todo` |
| Depends on | 6.4, 2.1 |
| Blocks | — |
| Feature spec | `feature-specs/19-settings.md` |
| Contract | `docs/api/settings.md` |
| Endpoints | `GET /settings`, `PUT /settings`, `GET /checkin-ips`, `POST /checkin-ips`, `PUT /checkin-ips/{id}`, `DELETE /checkin-ips/{id}` |

## Objective
Per-branch configuration: branch info, the teacher check-in IP whitelist, and class fee amounts.

## Screens / Components
- Tabbed **Branch settings**:
  - **Branch info** (name/contact/address fields per contract).
  - **Check-in IP whitelist manager**: list (`GET /checkin-ips`), add/edit/remove IPs (`POST`/`PUT`/`DELETE /checkin-ips/{id}`) — these gate teacher attendance (3.3).
  - **Class fee amounts** per class (via settings / fee structures per contract).
- Super admin can manage any branch (branch switcher); branch admins only their own (API-enforced).

## Behavior
- RHF + Zod; `422` → fields; success toast; IP add/remove confirm + cache invalidation.

## Rules
- Permission-gated; branch scoping API-enforced (out-of-branch → 404).

## Check When Done
- [ ] Branch info, IP whitelist, and class fee amounts viewed and managed (with permission).
- [ ] IP whitelist changes reflect in teacher attendance behavior.
- [ ] Loading/error/validation states present.
- [ ] `npm run build` passes.
