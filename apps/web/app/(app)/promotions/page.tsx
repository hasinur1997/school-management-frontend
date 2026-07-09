"use client"

/**
 * Promotion route (task 4.5). Reachable directly, so it gates its own content on
 * `promotion.execute` and renders an access-denied state when absent rather than
 * partial UI (`code-standards.md`, Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { PromotionsPage, PROMOTION_EXECUTE } from "@/components/promotions"

export default function PromotionsRoute() {
  const canView = usePermission(PROMOTION_EXECUTE)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view promotions."
      />
    )
  }

  return <PromotionsPage />
}
