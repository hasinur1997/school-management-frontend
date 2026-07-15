"use client"

/**
 * The content-column topbar (task 1.5), three zones per `ui-context.md`:
 *   left   — sidebar hamburger (`< lg`); the brand now lives in the sidebar;
 *   center — the global command search;
 *   right  — theme switcher, branch switcher, notifications, user menu.
 * Sits at the top of the content column (right of the full-height sidebar).
 */

import { Bell, Menu } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { GlobalSearch } from "@/components/app-shell/global-search"
import { UserMenu } from "@/components/app-shell/user-menu"

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-surface-border bg-surface px-4 sm:gap-3 sm:px-6">
      {/* Left: hamburger (< lg). Balances the right cluster so search centers. */}
      <div className="flex flex-1 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Center: global command search, capped and centered. */}
      <div className="flex w-full max-w-110 justify-center">
        <GlobalSearch />
      </div>

      {/* Right: theme, notifications, user. */}
      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
        <ThemeSwitcher />
        <Button
          variant="outline"
          size="icon"
          className="relative size-11 sm:size-9"
          aria-label="Notifications"
          disabled
        >
          <Bell className="size-5" />
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 size-1.75 rounded-full bg-error ring-2 ring-surface"
          />
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-surface-border sm:block" />
        <UserMenu />
      </div>
    </header>
  )
}
