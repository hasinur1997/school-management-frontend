"use client"

/**
 * The grouped navigation list shared by the desktop sidebar and the mobile
 * drawer (task 1.5). Items are permission-filtered (`useAuth().hasPermission`),
 * highlight the active route, and — when `collapsed` — render icon-only with the
 * label exposed via `title`/`aria-label` and the group headings hidden.
 */

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { NAV_GROUPS, type NavItem } from "@/components/app-shell/nav-items"

/** A route is active when it matches exactly or is a parent of the current path. */
function isActive(pathname: string, href: string): boolean {
  // "/" is the dashboard root; it must match exactly so it doesn't light up as a
  // parent of every other route.
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
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
  const { hasPermission } = useAuth()

  // Filter items to what the user may see; drop groups left empty.
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0)

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
              active={isActive(pathname, item.href)}
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
