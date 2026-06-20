"use client"

/**
 * Teachers list route (task 2.4). The route is reachable directly, so it gates
 * its own content on `teachers.view` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { TeachersList, TEACHER_VIEW } from "@/components/teachers"

export default function TeachersPage() {
  const canView = usePermission(TEACHER_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view teachers."
      />
    )
  }

  return <TeachersList />
}
