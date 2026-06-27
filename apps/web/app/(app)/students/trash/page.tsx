"use client"

/**
 * Student trash route. Static `trash` sits beside `[id]`, so it is matched
 * before the student detail dynamic route. Gated on `student.delete`.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { StudentsTrash, STUDENT_DELETE } from "@/components/students"

export default function StudentsTrashPage() {
  const canDelete = usePermission(STUDENT_DELETE)

  if (!canDelete) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage deleted students."
      />
    )
  }

  return <StudentsTrash />
}
