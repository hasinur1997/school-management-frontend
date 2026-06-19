"use client"

/**
 * The fixed desktop sidebar (task 1.5): full-height, below the topbar, with the
 * grouped permission-filtered nav and a collapse toggle whose state is persisted
 * by the parent shell. Hidden `< lg`, where the nav moves into an off-canvas
 * drawer (see `app-shell.tsx`). Only its nav list scrolls; the toggle stays put.
 */

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { SidebarNav } from "@/components/app-shell/sidebar-nav"

export function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <aside
      className={cn(
        "fixed top-16 bottom-0 left-0 z-30 hidden flex-col border-r border-surface-border bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="border-t border-surface-border p-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("text-copy-secondary", collapsed ? "mx-auto" : "w-full justify-start gap-2")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="size-5" aria-hidden />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
