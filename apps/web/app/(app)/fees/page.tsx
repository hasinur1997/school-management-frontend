"use client"

/**
 * Fee-structures route (task F-5.1). The route is reachable directly, so it
 * gates its own content on `fee.manage` and renders an access-denied state when
 * the permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { FeeStructuresList, FEE_MANAGE } from "@/components/fees"

export default function FeeStructuresPage() {
  const canManage = usePermission(FEE_MANAGE)

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage fee structures."
      />
    )
  }

  return <FeeStructuresList />
}
