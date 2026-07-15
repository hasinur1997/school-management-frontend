"use client"

/**
 * Post-login branch picker. When a user has two or more accessible branches and
 * hasn't chosen one this session (`BranchProvider.needsBranchSelection`), this
 * modal blocks the dashboard until they pick — matching the requirement that
 * logging in first opens a branch chooser, then lands on the scoped dashboard.
 * Single-branch users are auto-selected upstream and never see this.
 */

import * as React from "react"
import { Building2, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { useBranch } from "@/components/branch/branch-provider"
import { BranchRow } from "@/components/branch/branch-row"
import type { Branch } from "@/types/branch"

function matches(branch: Branch, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    branch.name.toLowerCase().includes(q) ||
    (branch.name_bn?.toLowerCase().includes(q) ?? false)
  )
}

export function BranchSelectDialog() {
  const { needsBranchSelection, branches, setActiveBranch } = useBranch()
  const [query, setQuery] = React.useState("")

  const showSearch = branches.length > 6
  const filtered = branches.filter((b) => matches(b, query))

  return (
    <Dialog
      open={needsBranchSelection}
      // Non-dismissable: a branch must be chosen before the app is usable.
      onOpenChange={() => {}}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-2xl p-0 sm:max-w-md"
      >
        <DialogHeader className="p-6 pb-3" icon={<Building2 />}>
          <DialogTitle>Choose a branch</DialogTitle>
          <DialogDescription>
            Pick the branch to work in. You can switch anytime from the sidebar.
          </DialogDescription>
        </DialogHeader>

        {showSearch ? (
          <div className="px-6 pb-2">
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
        ) : null}

        <div className="max-h-[400px] overflow-y-auto px-4 pb-5 pt-1">
          {filtered.length > 0 ? (
            filtered.map((branch) => (
              <BranchRow
                key={branch.id}
                branch={branch}
                isCurrent={false}
                onSelect={() => setActiveBranch(branch.id)}
              />
            ))
          ) : (
            <p className="px-2.5 py-6 text-center text-sm text-copy-muted">
              No branches match “{query.trim()}”
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
