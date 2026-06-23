"use client"

/**
 * Authenticated app shell (task 1.5): a full-height sidebar on the left with the
 * brand header at its top, and a content column whose own topbar sits above a
 * scrollable content area. `< lg` the sidebar becomes an off-canvas drawer
 * (Sheet) toggled by the topbar hamburger. The collapsed/expanded state is
 * persisted in localStorage.
 *
 * Rendered inside `AuthProvider` + `BranchProvider` so nav gating, the user
 * menu, and the branch switcher all have their context.
 */

import * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Brand } from "@/components/app-shell/brand"
import { Sidebar } from "@/components/app-shell/sidebar"
import { SidebarNav } from "@/components/app-shell/sidebar-nav"
import { Topbar } from "@/components/app-shell/topbar"

const COLLAPSED_KEY = "sidebar_collapsed"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(COLLAPSED_KEY) === "1"
  })
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0")
      }
      return next
    })
  }, [])

  return (
    <div className="flex h-svh overflow-hidden bg-base">
      {/* ≥ lg: full-height sidebar with the brand header at its top. */}
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      {/* < lg: off-canvas nav drawer. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-surface-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
          </SheetHeader>
          <div className="overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Content column: its own topbar above a scrollable content area. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
