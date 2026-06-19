/**
 * Branch contract types. `GET /branches` is the source for the super-admin
 * branch switcher (task 1.5) and branch management (task 2.3). The API replies
 * inside the standard envelope; this describes the unwrapped `data` items.
 */

export interface Branch {
  id: number
  name: string
  code?: string | null
  address?: string | null
  contact?: string | null
}
