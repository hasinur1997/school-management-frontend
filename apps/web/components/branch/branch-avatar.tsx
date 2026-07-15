"use client"

/**
 * Rounded-square branch badge: the branch logo when set, otherwise the branch
 * initials on its deterministic accent color (`lib/branch/visual`). Shape and
 * size are controlled by the caller via `className`. Mirrors the imported
 * "Branch Switcher" design's avatar; the accent color is data-driven (like user
 * avatars), while surrounding chrome uses theme tokens.
 */

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { branchColor, branchInitials } from "@/lib/branch/visual"
import type { Branch } from "@/types/branch"

export function BranchAvatar({
  branch,
  className,
  style,
}: {
  branch: Pick<Branch, "id" | "name" | "logo_url">
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[28%] font-bold text-white",
        className
      )}
      style={{
        background: branch.logo_url ? undefined : branchColor(branch.id),
        ...style,
      }}
    >
      {branch.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branch.logo_url}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        branchInitials(branch.name)
      )}
    </span>
  )
}
