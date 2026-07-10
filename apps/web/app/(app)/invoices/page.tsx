"use client"

/**
 * Invoices list route (task F-5.2). Reachable directly, so it gates its own
 * content on `invoice.view` and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { InvoicesList, INVOICE_VIEW } from "@/components/invoices"

export default function InvoicesPage() {
  const canView = usePermission(INVOICE_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view invoices."
      />
    )
  }

  return <InvoicesList />
}
