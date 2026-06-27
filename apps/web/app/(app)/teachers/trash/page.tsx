"use client"

/**
 * Teacher trash route. Static `trash` sits beside `[id]`, so it is matched
 * before the teacher detail dynamic route. Gated on `teacher.delete`.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { TeachersTrash, TEACHER_DELETE } from "@/components/teachers"

export default function TeachersTrashPage() {
  const canManage = usePermission(TEACHER_DELETE)

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage deleted teachers."
      />
    )
  }

  return <TeachersTrash />
}
