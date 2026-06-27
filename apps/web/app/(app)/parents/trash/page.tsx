"use client"

/**
 * Parent trash route. Static `trash` sits beside `[id]`, so it is matched
 * before the parent detail dynamic route. Gated on `parent.manage`.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { ParentsTrash, PARENT_MANAGE } from "@/components/parents"

export default function ParentsTrashPage() {
  const canManage = usePermission(PARENT_MANAGE)

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage deleted parent accounts."
      />
    )
  }

  return <ParentsTrash />
}
