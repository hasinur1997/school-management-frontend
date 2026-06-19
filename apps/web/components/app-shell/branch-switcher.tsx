"use client"

/**
 * Branch switcher (task 1.5) — rendered only for super admin. Selecting a branch
 * sets the active branch context (forwarded to the API as `branch_id` and used
 * to re-scope queries); "All branches" selects the consolidated view where the
 * API supports it. Non-super-admin users render a static branch label instead
 * and send no `branch_id`.
 */

import * as React from "react"
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { useBranch } from "@/components/branch/branch-provider"
import { useBranches } from "@/hooks/branches/use-branches"

const ALL_BRANCHES_LABEL = "All branches"

export function BranchSwitcher() {
  const { isSuperAdmin, user } = useAuth()
  const { activeBranchId, setActiveBranch } = useBranch()
  const branchesQuery = useBranches(isSuperAdmin)

  // Non-super-admin: static label for their owning branch, no switching.
  if (!isSuperAdmin) {
    const name = user.branch?.name
    if (!name) return null
    return (
      <span className="inline-flex h-11 items-center gap-1.5 rounded-md border border-surface-border bg-surface px-2.5 text-sm text-copy-secondary sm:h-9">
        <Building2 className="size-4 text-copy-muted" aria-hidden />
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
      </span>
    )
  }

  const branches = branchesQuery.data ?? []
  const active = branches.find((branch) => branch.id === activeBranchId)
  const label = active ? active.name : ALL_BRANCHES_LABEL

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            aria-label="Switch branch"
          >
            <Building2 className="size-4 text-copy-muted" aria-hidden />
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {label}
            </span>
            <ChevronsUpDown className="size-3.5 text-copy-muted" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Branch</DropdownMenuLabel>
        </DropdownMenuGroup>

        <BranchOption
          selected={activeBranchId === null}
          onSelect={() => setActiveBranch(null)}
        >
          {ALL_BRANCHES_LABEL}
        </BranchOption>

        <DropdownMenuSeparator />

        {branchesQuery.isPending ? (
          <div className="flex items-center gap-2 px-1.5 py-2 text-sm text-copy-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading branches…
          </div>
        ) : branchesQuery.isError ? (
          <div className="px-1.5 py-2 text-sm text-error">
            Couldn&apos;t load branches.
          </div>
        ) : branches.length === 0 ? (
          <div className="px-1.5 py-2 text-sm text-copy-muted">
            No branches found.
          </div>
        ) : (
          branches.map((branch) => (
            <BranchOption
              key={branch.id}
              selected={activeBranchId === branch.id}
              onSelect={() => setActiveBranch(branch.id)}
            >
              {branch.name}
            </BranchOption>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BranchOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <DropdownMenuItem onClick={onSelect} className="justify-between">
      <span className="truncate">{children}</span>
      <Check
        className={cn("size-4 text-brand", selected ? "opacity-100" : "opacity-0")}
        aria-hidden
      />
    </DropdownMenuItem>
  )
}
