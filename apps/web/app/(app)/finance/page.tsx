"use client"

/**
 * Finance route (task F-5.4). Reachable directly, so it gates its own content on
 * `income.manage` OR `expense.manage` and renders an access-denied state when
 * neither is held rather than partial UI (`code-standards.md`, Authorization).
 * The API stays authoritative. Which tabs appear inside is decided per-permission
 * by `FinanceManagement`.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { FinanceManagement, INCOME_MANAGE, EXPENSE_MANAGE } from "@/components/finance"

export default function FinancePage() {
  const canIncome = usePermission(INCOME_MANAGE)
  const canExpense = usePermission(EXPENSE_MANAGE)

  if (!canIncome && !canExpense) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage finance entries."
      />
    )
  }

  return <FinanceManagement />
}
