"use client"

/**
 * `usePermission(permission)` — the canonical UI authorization check. Reads the
 * permission list from the auth context and returns whether the current user
 * holds it. Gate nav items, buttons, and row actions on this; never on role
 * names (`code-standards.md`, Authorization). The API's `401/403/404` remains
 * the real boundary — this only hides what the user can't reach.
 */

import { useAuth } from "@/components/auth/auth-provider"

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}
