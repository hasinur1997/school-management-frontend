"use client"

/**
 * `<Can permission="…">` — declarative permission gate. Renders its children
 * only when the current user holds the permission; otherwise renders `fallback`
 * (nothing by default). Use for inline gating of buttons/sections; route-level
 * gating belongs in the server guard. Permission-based, never role-based.
 */

import * as React from "react"

import { usePermission } from "@/hooks/auth/use-permission"

export interface CanProps {
  permission: string
  children: React.ReactNode
  /** Rendered when the permission is absent. Defaults to nothing. */
  fallback?: React.ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission)
  return <>{allowed ? children : fallback}</>
}
