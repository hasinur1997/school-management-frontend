/**
 * Auth contract types — the shapes the `/auth/*` endpoints return (see
 * `feature-specs/03-auth.md`). The API replies inside the standard envelope
 * (`{ success, message, data }`); these describe the unwrapped `data`.
 *
 * Authorization is driven by the flat `permissions` list — the UI gates on
 * permissions, never role names (`architecture-context.md`, Auth model).
 */

/** Branch a user belongs to; only super admin can switch context. */
export interface AuthBranch {
  id: number
  name: string
}

/** The signed-in user as returned by `POST /auth/login` and `GET /auth/me`. */
export interface AuthUser {
  id: number
  name: string
  /** Login email; may be absent for ID-based accounts. */
  email: string | null
  username?: string | null
  phone?: string | null
  /** Profile photo URL the API serves (`UserResource.photo_url`), when set. */
  photo_url?: string | null
  /** Owning branch (single-branch users); `null`/absent for super admin. */
  branch_id?: number | null
  branch?: AuthBranch | null
  /** Role names — surfaced for display only, never gated on. */
  roles: string[]
  /** Flat permission list the UI gates on. */
  permissions: string[]
}

/** Payload of a successful `POST /auth/login`: bearer token + the user. */
export interface LoginResponse {
  token: string
  user: AuthUser
}

/**
 * Editable fields of the signed-in user's own profile (`PUT /auth/profile`).
 * Authorization, role, branch, and permission data are never editable here —
 * those stay API-owned. The photo is uploaded separately as multipart.
 */
export interface ProfileUpdateInput {
  name: string
  email?: string | null
  phone?: string | null
}

/** Display name initials for the avatar fallback when no photo is set. */
export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
