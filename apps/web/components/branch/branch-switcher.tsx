"use client"

/**
 * Global branch switcher — the imported "Branch Switcher" design, mounted at the
 * top of the sidebar. Shows the current branch as a trigger; the popover offers
 * search, a "Recently used" section, the full accessible-branch list, and (for
 * users who may manage branches) a "Create new branch" action. Selecting a
 * branch re-scopes all data (via `BranchProvider`) and confirms with a toast.
 *
 * Structure follows the design; colors map to theme tokens (`ui-context.md`),
 * except the data-driven branch avatar accent.
 */

import * as React from "react"
import { ChevronsUpDown, Plus, Search } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { toastSuccess } from "@/lib/toast"
import { useAuth } from "@/components/auth/auth-provider"
import { useBranch } from "@/components/branch/branch-provider"
import { BranchAvatar } from "@/components/branch/branch-avatar"
import { BranchRow } from "@/components/branch/branch-row"
import { CreateBranchModal } from "@/components/branch/create-branch-modal"
import type { Branch } from "@/types/branch"

function matches(branch: Branch, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    branch.name.toLowerCase().includes(q) ||
    (branch.name_bn?.toLowerCase().includes(q) ?? false)
  )
}

export function BranchSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { hasPermission } = useAuth()
  const {
    branches,
    currentBranch,
    activeBranchId,
    recentBranches,
    setActiveBranch,
  } = useBranch()

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  // The branch awaiting confirmation before the switch is applied.
  const [pendingBranch, setPendingBranch] = React.useState<Branch | null>(null)

  const canCreate = hasPermission("branch.manage")

  // Reset the search each time the popover opens.
  React.useEffect(() => {
    if (open) setQuery("")
  }, [open])

  const filtered = branches.filter((b) => matches(b, query))
  const searching = query.trim().length > 0
  const recentIds = new Set(recentBranches.map((b) => b.id))
  // When not searching, the "All branches" list excludes the recents shown above.
  const allList = searching ? filtered : filtered.filter((b) => !recentIds.has(b.id))

  function handleSelect(branch: Branch) {
    setOpen(false)
    if (branch.id === activeBranchId) return
    // Confirm before re-scoping all data to the newly selected branch.
    setPendingBranch(branch)
  }

  function confirmSwitch() {
    if (!pendingBranch) return
    const branch = pendingBranch
    setPendingBranch(null)
    setActiveBranch(branch.id)
    toastSuccess(`Switched to ${branch.name} — all data now shows this branch`, {
      id: "branch-switch",
    })
  }

  function handleCreated(branch: Branch) {
    setActiveBranch(branch.id)
  }

  const displayBranch = currentBranch ?? branches[0]

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Switch branch"
              className={cn(
                "flex items-center rounded-xl  border-surface-border bg-surface text-left transition-colors hover:border-brand/40 data-[popup-open]:border-brand/40",
                collapsed ? "size-10 justify-center p-0" : "w-full gap-2.5"
              )}
            >
              {displayBranch ? (
                <BranchAvatar
                  branch={displayBranch}
                  className={collapsed ? "size-9 text-sm" : "size-9 text-sm"}
                  style={{ boxShadow: "0 2px 8px rgba(16,16,20,0.16)" }}
                />
              ) : (
                <span className="grid size-9 place-items-center rounded-[28%] bg-brand/10 text-sm font-bold text-brand">
                  ?
                </span>
              )}
              {!collapsed ? (
                <>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-copy-primary">
                      {displayBranch?.name ?? "Select branch"}
                    </span>
                    <span className="text-[11.5px] font-medium text-copy-muted">
                      School MS
                    </span>
                  </span>
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-border/40 text-copy-muted">
                    <ChevronsUpDown className="size-3.5" aria-hidden />
                  </span>
                </>
              ) : null}
            </button>
          }
        />

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-80 gap-0 p-0"
        >
          {/* Search */}
          <div className="p-3 pb-2">
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 size-4 text-copy-muted"
                aria-hidden
              />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search branches…"
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto px-2 pb-2">
            {/* Recently used */}
            {!searching && recentBranches.length > 0 ? (
              <>
                <SectionLabel>Recently used</SectionLabel>
                {recentBranches.map((branch) => (
                  <BranchRow
                    key={branch.id}
                    branch={branch}
                    isCurrent={branch.id === activeBranchId}
                    onSelect={() => handleSelect(branch)}
                  />
                ))}
              </>
            ) : null}

            {/* All branches */}
            <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
              <SectionLabel className="p-0">
                {searching ? "Results" : "All branches"}
              </SectionLabel>
              <span className="text-[11px] font-medium text-copy-muted">
                {searching ? filtered.length : branches.length}
              </span>
            </div>

            {allList.length > 0 ? (
              allList.map((branch) => (
                <BranchRow
                  key={branch.id}
                  branch={branch}
                  isCurrent={branch.id === activeBranchId}
                  onSelect={() => handleSelect(branch)}
                />
              ))
            ) : searching ? (
              <p className="px-2.5 py-6 text-center text-sm text-copy-muted">
                No branches match “{query.trim()}”
              </p>
            ) : recentBranches.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-sm text-copy-muted">
                No branches available.
              </p>
            ) : null}
          </div>

          {/* Footer: create */}
          {canCreate ? (
            <div className="border-t border-surface-border p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setCreateOpen(true)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
              >
                <span className="grid size-8 place-items-center rounded-lg border border-dashed border-brand/50">
                  <Plus className="size-4" aria-hidden />
                </span>
                Create new branch
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <Dialog
        open={pendingBranch !== null}
        onOpenChange={(next) => {
          if (!next) setPendingBranch(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader
            icon={pendingBranch ? <BranchAvatar branch={pendingBranch} /> : undefined}
          >
            <DialogTitle>Switch branch?</DialogTitle>
            <DialogDescription>
              This will re-scope all data to{" "}
              <span className="font-semibold text-copy-primary">
                {pendingBranch?.name}
              </span>
              . Any unsaved work in the current branch view may be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingBranch(null)}>
              Cancel
            </Button>
            <Button onClick={confirmSwitch}>Switch branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canCreate ? (
        <CreateBranchModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  )
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-copy-muted",
        className
      )}
    >
      {children}
    </div>
  )
}
