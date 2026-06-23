"use client"

/**
 * Students list route (task 2.7). The route is reachable directly, so it gates
 * its own content on `student.view` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { StudentsList, STUDENT_VIEW } from "@/components/students"

export default function StudentsPage() {
  const canView = usePermission(STUDENT_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view students."
      />
    )
  }

  return <StudentsList />
}
