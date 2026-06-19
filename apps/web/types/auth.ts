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
  /** Profile photo URL the API serves, when set. */
  avatar_url?: string | null
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
