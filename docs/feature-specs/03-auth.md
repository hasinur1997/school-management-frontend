# 03 — Authentication

Wire Sanctum token auth: login, session, current user, permissions context, route protection, password change. Contract: `docs/api/auth.md`.

## Endpoints consumed

- `POST /auth/login` → returns token + user. Public.
- `GET /auth/me` → current user with roles and permission list.
- `POST /auth/change-password`.
- Logout: clear the token client + server side (and revoke per the API contract).

## Implementation

- Login page (standalone layout, no app shell): email/identifier + password form (React Hook Form + Zod). On success, store the token in an httpOnly cookie via a server action / route handler, then redirect to `/dashboard`.
- Session helper in `lib/auth`: read/clear the cookie server-side; expose the token to the Axios client.
- Fetch `GET /auth/me` once after login / on app load; provide the user and **permission list** through a context/provider.
- Add a `usePermission(permission)` helper and a `<Can permission="...">` gate component.
- Route protection: a server-side check in the authenticated route group redirects unauthenticated users to login. The public group (login, public admission) is exempt.
- Map the API `422` to field errors and invalid-credentials messages to a form banner.
- User menu (in the app shell, built in 04): profile, change password dialog, logout.

## Rules

- Token in httpOnly cookie only — never `localStorage`.
- Gate UI on permissions, never role names. Treat API `401/403/404` as authoritative.

## Check When Done

- A user can log in, land on the dashboard, and log out.
- `GET /auth/me` populates the permissions context; `<Can>` hides/shows correctly.
- Unauthenticated access to a protected route redirects to login.
- Change-password works and surfaces validation errors.
- `npm run build` passes.
