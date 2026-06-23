/**
 * User account shape returned by `GET /users/{id}` (`UserAccountResource`).
 * Used by the read-only user profile view linked from "recorded by" on the
 * attendance roster. Ids are opaque `public_id` hashes (strings).
 */
export interface UserAccount {
  id: string
  name: string
  email: string | null
  phone: string | null
  is_active: boolean | null
  /** Assigned role names (e.g. `["admin"]`). */
  roles: string[]
}
