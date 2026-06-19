# Task F-6.6 — Access Control (Assign Roles to Users, Permissions to Roles)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `todo` (blocked) |
| Depends on | 6.4; **backend task 15.1 (access control API) — not yet implemented** |
| Feature spec | `feature-specs/20-access-control.md` |
| Contract | `docs/api/access-control.md` |
| Endpoints | `GET /permissions`, `GET /roles`, `GET /roles/{id}`, `PUT /roles/{id}/permissions`, `GET /users`, `PUT /users/{id}/roles` |

> ⚠️ **Dependency:** these endpoints do not exist until backend task 15.1 ships (1.2 deferred role/permission management to seeders). Do not start until the backend exposes the documented routes; until then, keep the screen hidden behind the missing `role.manage` permission.

## Objective
Super-admin screen to manage authorization: edit which permissions each role grants, and assign roles to user accounts. Gated by `role.manage` (super-admin-only).

## Screens / Components
- **Roles → permissions** editor:
  - Role list with `users_count` and `is_protected` badge.
  - Permission checklist grouped by module (from `GET /permissions`), pre-checked from the role's current set.
  - Save = sync (`PUT /roles/{id}/permissions`); the `super_admin` role is read-only (locked, no save).
- **Users → roles** assignment:
  - Paginated user table (`GET /users`) with `search` + `role` filter; mobile → card list.
  - Per-user role selector; save = sync (`PUT /users/{id}/roles`).

## Behavior
- RHF + Zod; `422` → fields (`permissions` / `roles`); success toast.
- Invalidate roles, users, and the current user's `/auth/me` caches on write (a role/permission change can alter the acting user's own effective permissions and thus UI gating).
- Surface backend guards as inline errors: editing super_admin → `403`; stripping the last super admin → `422` on `roles`.

## Rules
- Permission-based gating only — the whole route is behind `role.manage`; never role-name checks in the UI.
- Do not invent roles or permissions; render only what `GET /roles` and `GET /permissions` return (registry is seeder-fixed).
- `403/404` from the API is the authoritative access boundary → access/not-found state.

## Check When Done
- [ ] Backend 15.1 endpoints confirmed live.
- [ ] Role permission set edited and saved (sync); super_admin role locked.
- [ ] Roles assigned to users with search/role filter + pagination.
- [ ] Lockout (last super admin) and protected-role errors surfaced; loading/empty/error states present.
- [ ] `npm run build` passes.
