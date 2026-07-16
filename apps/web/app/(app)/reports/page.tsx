"use client"

/**
 * Reports route (task F-6.3, feature-spec 18). Reachable directly, so it gates
 * its own content on `report.view` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays the real boundary.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { ReportsView, REPORT_VIEW } from "@/components/reports"

export default function ReportsPage() {
  const canView = usePermission(REPORT_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view reports."
      />
    )
  }

  return <ReportsView />
}
