"use client"

/**
 * Mark-entry route (task 4.2). The route is reachable directly, so it gates its
 * own content on `marks.entry` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { MarkEntryGrid, MARKS_ENTRY } from "@/components/marks"

export default function MarksPage() {
  const canEnter = usePermission(MARKS_ENTRY)

  if (!canEnter) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to enter marks."
      />
    )
  }

  return <MarkEntryGrid />
}
