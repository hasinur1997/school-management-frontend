# Task F-1.4 — Authentication & Permissions Context

| Field | Value |
|---|---|
| Phase | 1 — Foundation |
| Status | `done` |
| Depends on | 1.2, 1.3 |
| Blocks | 1.5, every authenticated screen |
| Feature spec | `feature-specs/03-auth.md` |
| Contract | `docs/api/auth.md` |
| Endpoints | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout` |

## Objective
Token auth end to end: login, httpOnly-cookie session, current-user/permissions context, route protection, change-password.

## Screens / Components
- **Login page** — standalone layout (no app shell): email/identifier + password (RHF + Zod). On success store the token in an httpOnly cookie via a server action/route handler, then redirect to `/dashboard`.
- **Change-password dialog** (surfaced from the user menu built in 1.5).
- `lib/auth` session helper: read/clear cookie server-side; expose token to the Axios client.
- Permissions provider: fetch `GET /auth/me` once after login / on app load; expose user + roles + **permission list**.
- `usePermission(permission)` helper and `<Can permission="...">` gate.
- Route protection: server-side check in the authenticated route group redirects unauthenticated users to login; public group (login, public admission, payment return) exempt.

## Behavior
- Invalid credentials → form banner; `422` → per-field messages.
- `401` anywhere clears the session and redirects to login.
- Logout clears token client + server side (revoke per contract).

## Rules
- Token in httpOnly cookie only — never `localStorage`.
- Gate on permissions, never role names. API `401/403/404` is authoritative.

## Check When Done
- [x] User can log in → dashboard → log out.
- [x] `GET /auth/me` populates permissions; `<Can>` hides/shows correctly.
- [x] Unauthenticated access to a protected route redirects to login.
- [x] Change-password works and surfaces validation errors.
- [x] `npm run build` passes.
