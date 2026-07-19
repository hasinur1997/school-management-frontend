"use client"

/**
 * The grouped navigation list shared by the desktop sidebar and the mobile
 * drawer (task 1.5). Items are permission-filtered (`useAuth().hasPermission`),
 * highlight the active route, and — when `collapsed` — render icon-only with the
 * label exposed via `title`/`aria-label` and the group headings hidden.
 */

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { NAV_GROUPS, type NavItem } from "@/components/app-shell/nav-items"

/**
 * How strongly an item matches the current route: the length of the matched
 * href, or `-1` when it doesn't match. A route matches when it equals the
 * item's href or is a child of it. Returning a score (not a boolean) lets the
 * caller pick the **most specific** match so a nested route like
 * `/settings/access-control` lights up its own item, not the parent `/settings`.
 */
function matchScore(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get" | "has">,
  item: NavItem
): number {
  const href = item.activePath ?? item.href
  if (item.activeSearch) {
    if (pathname !== href) return -1
    const ok = Object.entries(item.activeSearch).every(([key, value]) =>
      value == null ? !searchParams.has(key) : searchParams.get(key) === value
    )
    // Search-scoped items outrank a bare path match on the same href.
    return ok ? href.length + 1 : -1
  }
  // "/" is the dashboard root; it must match exactly so it doesn't light up as a
  // parent of every other route.
  if (href === "/") return pathname === "/" ? href.length : -1
  if (pathname === href || pathname.startsWith(`${href}/`)) return href.length
  return -1
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  /** Called after an item is chosen (used to close the mobile drawer). */
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { hasPermission, roles } = useAuth()

  // An item shows when the user holds its permission, or — for self-service
  // items — when they hold one of its declared roles (`nav-items.ts`).
  const canSee = React.useCallback(
    (item: NavItem) =>
      item.roleOnly
        ? (item.roles?.some((role) => roles.includes(role)) ?? false)
        : hasPermission(item.permission) ||
          (item.permissions?.some((permission) => hasPermission(permission)) ??
            false) ||
          (item.roles?.some((role) => roles.includes(role)) ?? false),
    [hasPermission, roles]
  )

  // Filter items to what the user may see; drop groups left empty.
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(canSee),
  })).filter((group) => group.items.length > 0)

  // Only the most specific matching item is active, so a nested route (e.g.
  // `/settings/access-control`) highlights its own item and not the parent.
  let activeItem: NavItem | null = null
  let activeScore = 0
  for (const group of groups) {
    for (const item of group.items) {
      const score = matchScore(pathname, searchParams, item)
      if (score > activeScore) {
        activeItem = item
        activeScore = score
      }
    }
  }

  return (
    <nav className="flex flex-col gap-4 px-3 py-4" aria-label="Main navigation">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {!collapsed ? (
            <p className="px-2 pb-1 text-xs font-medium tracking-wide text-copy-muted uppercase">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={item === activeItem}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  )
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors lg:min-h-9",
        collapsed && "justify-center",
        active
          ? "bg-accent-dim font-semibold text-brand"
          : "font-medium text-copy-secondary hover:bg-subtle hover:text-copy-primary"
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  )
}
