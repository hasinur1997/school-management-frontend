# Task F-6.6 — Access Control (Assign Roles to Users, Permissions to Roles)

| Field | Value |
|---|---|
| Phase | 6 — Documents, Reports, Settings |
| Status | `done` |
| Depends on | 6.4; backend task 15.1 (access control API) — **now live** (`routes/api/v1/access-control.php`) |
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
- [x] Backend 15.1 endpoints confirmed live.
- [x] Role permission set edited and saved (sync); super_admin role locked.
- [x] Roles assigned to users with search/role filter + pagination.
- [x] Lockout (last super admin) and protected-role errors surfaced; loading/empty/error states present.
- [x] `npm run build` passes.

## Implementation notes
- Route `app/(app)/settings/access-control/` (page/loading/error), gated on `role.manage`; sidebar item added under Administration; the Settings "Users & roles" section now links here.
- **Imported "Access Control" Claude Design implemented exactly** for the Roles → permissions editor (`components/access-control/roles-permissions-editor.tsx`): sticky role list (coloured dot/badge per role, `users_count`, live grant count), permission-matrix card with role badge header + protected-role banner, Save/Discard, legend, and Grant all / Deny all. The matrix is the design's **exact `Module | View | Create | Edit | Delete` grid** (`grid-template-columns: minmax(0,1fr) repeat(4,74px)`, 23px purple check-squares, `14×2px` dash for **Not applicable**, 3-item legend). Because the registry is seeder-fixed with richer verbs than CRUD, `components/access-control/matrix.ts` projects each real permission onto one of the four columns (`view→View`; `create/entry/generate/issue/execute/collect→Create`; `update/edit/manage/approve/override→Edit`; `delete→Delete`) — verified collision-free across all 24 modules, a cell holds an array so nothing is ever dropped, and the real permission name is the cell tooltip so the CRUD relabel isn't misleading. super_admin (`is_protected`) is locked → "Full access", no toggles, no save.
- **Users → roles** (`users-roles-panel.tsx`): paginated `GET /users` with debounced search + role filter, table ≥ md / cards below. A user may hold **one or more roles** — the per-row control is a **multi-select popover** (checkbox list, Cancel/Save) syncing the whole set `{ roles: [...] }`; the Roles column shows every current role as a coloured pill.
- Writes invalidate `["roles"]`, `["access-users"]` **and** `["auth","me"]` (a permission/role change can alter the acting super admin's own gating). 403 (edit super_admin) and 422 (last super admin / unknown permission) surface as toasts.
- Types `types/access-control.ts`; hooks `hooks/access-control/use-access-control.ts`. `tsc` + `lint` (0 errors) + `npm run build` (`/settings/access-control` emitted) pass.
