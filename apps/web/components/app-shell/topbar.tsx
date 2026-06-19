"use client"

/**
 * The fixed full-width topbar (task 1.5), three zones per `ui-context.md`:
 *   left   — sidebar hamburger (`< lg`) + logo/brand, aligned over the sidebar;
 *   center — the global search slot (placeholder until 1.6);
 *   right  — theme switcher, branch switcher, notifications, user menu.
 * Stays fixed above the content; nothing renders under it.
 */

import { Bell, Menu } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Brand } from "@/components/app-shell/brand"
import { BranchSwitcher } from "@/components/app-shell/branch-switcher"
import { SearchPlaceholder } from "@/components/app-shell/search-placeholder"
import { UserMenu } from "@/components/app-shell/user-menu"

export function Topbar({
  collapsed,
  onOpenMobileNav,
}: {
  collapsed: boolean
  onOpenMobileNav: () => void
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-surface-border bg-surface px-4 sm:gap-3">
      {/* Left: hamburger (< lg) + brand, aligned over the sidebar width. */}
      <div
        className={cn(
          "flex items-center gap-2 overflow-hidden transition-[width] duration-200 lg:shrink-0",
          collapsed ? "lg:w-16" : "lg:w-56"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
        >
          <Menu className="size-5" />
        </Button>
        <Brand />
      </div>

      {/* Center: global search slot. */}
      <div className="flex flex-1 justify-center">
        <SearchPlaceholder />
      </div>

      {/* Right: theme, branch, notifications, user. */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <ThemeSwitcher />
        <BranchSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="size-11 sm:size-9"
          aria-label="Notifications"
          disabled
        >
          <Bell className="size-5" />
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
