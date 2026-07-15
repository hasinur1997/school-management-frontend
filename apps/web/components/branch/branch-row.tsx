"use client"

/**
 * A single selectable branch row: avatar + English name + Bengali name, with a
 * check when it's the current branch. Shared by the sidebar switcher popup and
 * the post-login branch picker so both match the imported design.
 */

import { Check } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { BranchAvatar } from "@/components/branch/branch-avatar"
import type { Branch } from "@/types/branch"

export function BranchRow({
  branch,
  isCurrent,
  onSelect,
}: {
  branch: Branch
  isCurrent: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isCurrent}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        isCurrent ? "bg-brand/10" : "hover:bg-surface"
      )}
    >
      <BranchAvatar branch={branch} className="size-8 text-xs" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-copy-primary">
          {branch.name}
        </span>
        {branch.name_bn ? (
          <span className="truncate text-xs text-copy-secondary">
            {branch.name_bn}
          </span>
        ) : null}
      </span>
      {isCurrent ? (
        <Check className="size-4 shrink-0 text-brand" aria-hidden />
      ) : null}
    </button>
  )
}
