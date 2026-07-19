/**
 * The whole access-control surface is guarded by `role.manage` — seeded into no
 * role bundle, so only a super admin reaches it (via `Gate::before`). The route,
 * the nav item, and the settings entry all gate on this slug; the API's
 * `403/404` stays the authoritative boundary (`code-standards.md`).
 */
export const ROLE_MANAGE = "role.manage"
