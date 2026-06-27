"use client"

/**
 * Exams list route (task 4.1). The route is reachable directly, so it gates its
 * own content on `exam.view` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { ExamsList, EXAM_VIEW } from "@/components/exams"

export default function ExamsPage() {
  const canView = usePermission(EXAM_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view exams."
      />
    )
  }

  return <ExamsList />
}
