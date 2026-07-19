/**
 * Access-control contract (backend 15.1) — the super-admin surface that reads
 * the seeded permission registry, edits the permission bundle each role grants,
 * and assigns roles to user accounts.
 *
 * Endpoints: `GET /permissions`, `GET /roles`, `GET /roles/{id}`,
 * `PUT /roles/{id}/permissions`, `GET /users`, `PUT /users/{id}/roles`.
 *
 * The registry is **seeder-fixed** — the UI never invents roles or permissions;
 * it renders exactly what these endpoints return (`code-standards.md`).
 */

/** One assignable permission from the registry, with a human label. */
export interface RegistryPermission {
  /** Dotted slug, e.g. `student.view`. This is what the sync endpoints take. */
  name: string
  /** Server-humanized label, e.g. "Student View". */
  label: string
}

/** One module group of the registry (permissions sharing a `prefix.`). */
export interface PermissionGroup {
  /** Module key — the prefix before the first dot, e.g. `student`. */
  module: string
  permissions: RegistryPermission[]
}

/** `GET /permissions` payload. */
export interface PermissionRegistry {
  groups: PermissionGroup[]
}

/** A role with its granted permission set and assigned-user count. */
export interface Role {
  /** Opaque `public_id` hash. */
  id: string
  /** Slug name, e.g. `super_admin`. */
  name: string
  /** The super_admin role — bypasses every check and cannot be edited. */
  is_protected: boolean
  users_count: number
  /** Granted permission names (sorted by the API). */
  permissions: string[]
}

/** A user account row for the role-assignment table. */
export interface AccessUser {
  /** Opaque `public_id` hash. */
  id: string
  name: string
  email: string | null
  phone: string | null
  is_active: boolean | null
  /** Assigned role names. */
  roles: string[]
}

/** The six seeded role names the assignment filter/selector accepts. */
export const ASSIGNABLE_ROLES = [
  "super_admin",
  "admin",
  "accountant",
  "teacher",
  "student",
  "parent",
] as const

export type RoleName = (typeof ASSIGNABLE_ROLES)[number]

export type RoleFilter = RoleName | "all"

/** Body for creating a custom role (`POST /roles`). The name is slugged to a
 *  snake_case identifier server-side; an optional starting permission set. */
export interface CreateRoleInput {
  name: string
  permissions?: string[]
}

/** Query params for the paginated `GET /users` list. */
export interface AccessUserListParams {
  search?: string
  role?: RoleFilter
  page?: number
  per_page?: number
  /** Explicit branch override for a super-admin session. */
  branch_id?: string | number
}

/**
 * The verb portion of a dotted permission name — everything after the module
 * prefix, e.g. `teacher_attendance.manage` → `manage`, `marks.entry` → `entry`.
 */
export function permissionVerb(name: string): string {
  const dot = name.indexOf(".")
  return dot === -1 ? name : name.slice(dot + 1)
}

/** Turn a slug (`teacher_attendance`, `super_admin`) into "Teacher attendance". */
export function humanizeSlug(slug: string): string {
  const spaced = slug.replace(/[._]/g, " ").trim()
  if (!spaced) return slug
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
