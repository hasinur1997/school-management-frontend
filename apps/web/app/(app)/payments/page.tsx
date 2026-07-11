"use client"

/**
 * Payments list route (backend 10.6). Reachable directly, so it gates its own
 * content on `invoice.view` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { PaymentsList, INVOICE_VIEW } from "@/components/invoices"

export default function PaymentsPage() {
  const canView = usePermission(INVOICE_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view payments."
      />
    )
  }

  return <PaymentsList />
}
