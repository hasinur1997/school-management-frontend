/**
 * Branch contract types. `GET /branches` is the source for the super-admin
 * branch switcher (task 1.5) and branch management (task 2.3). The API replies
 * inside the standard envelope; this describes the unwrapped `data` items.
 */

export interface Branch {
  // Ids are opaque `public_id` hashes (strings), not numeric primary keys.
  id: string
  name: string
  /** Bengali branch name (optional; shown as the secondary line in the switcher). */
  name_bn?: string | null
  code?: string | null
  address?: string | null
  contact?: string | null
  /** Public URL of the branch logo, when one has been uploaded. */
  logo_url?: string | null
}
