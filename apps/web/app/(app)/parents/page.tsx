"use client"

import { Lock } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ParentsList, PARENT_MANAGE } from "@/components/parents"
import { usePermission } from "@/hooks/auth/use-permission"

export default function ParentsPage() {
  const canManage = usePermission(PARENT_MANAGE)

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage parent accounts."
      />
    )
  }

  return <ParentsList />
}
