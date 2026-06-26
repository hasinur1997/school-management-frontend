"use client"

/**
 * The full-height desktop sidebar (task 1.5): brand header at the top, the
 * grouped permission-filtered nav in the middle, and a collapse toggle pinned to
 * the bottom whose state is persisted by the parent shell. Hidden `< lg`, where
 * the nav moves into an off-canvas drawer (see `app-shell.tsx`). Only its nav
 * list scrolls; the brand header and toggle stay put.
 */

import * as React from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Brand } from "@/components/app-shell/brand"
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
        "hidden h-full shrink-0 flex-col border-r border-surface-border bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand header — aligned to the topbar height. */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-surface-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Brand iconOnly={collapsed} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <React.Suspense fallback={null}>
          <SidebarNav collapsed={collapsed} />
        </React.Suspense>
      </div>

      <div className="border-t border-surface-border p-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "text-copy-secondary",
            collapsed ? "mx-auto" : "w-full justify-start gap-2"
          )}
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
