# 20 — Access Control

Super-admin management of authorization: which permissions each role grants, and which roles a user holds. Contract: `docs/api/access-control.md`.

> Blocked until backend task 15.1 ships these endpoints (1.2 deferred role/permission management to seeders).

## Endpoints consumed

- `GET /permissions` — full assignable registry, grouped by module.
- `GET /roles`, `GET /roles/{id}`, `PUT /roles/{id}/permissions` — read roles; sync a role's permission set.
- `GET /users`, `PUT /users/{id}/roles` — list user accounts; sync a user's roles.

## Implementation

- **Roles → permissions** editor: role list (with user counts, protected-role badge) + a module-grouped permission checklist; save replaces (syncs) the role's set. The `super_admin` role is read-only.
- **Users → roles** assignment: paginated, searchable user table with a role filter; per-user role selector; save syncs the user's roles.
- Whole surface gated by `role.manage` (super-admin-only); the screen is hidden otherwise.

## Rules

- Permission-based gating only — never role-name checks in the UI.
- Render only roles/permissions the API returns; the registry is seeder-fixed (no inventing roles or permissions).
- Invalidate roles, users, and `/auth/me` on write — a change can alter the acting user's own effective permissions and UI gating.
- Surface API guards: editing super_admin → 403; removing the last super admin → 422.

## Check When Done

- [ ] Role permission sets edited/saved; super_admin locked.
- [ ] Roles assigned to users with search/filter/pagination.
- [ ] Protected-role and last-super-admin guards surfaced; states present.
- [ ] `npm run build` passes.
