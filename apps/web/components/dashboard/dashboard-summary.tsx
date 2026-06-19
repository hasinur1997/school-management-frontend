"use client"

/**
 * The dashboard's summary-card grid (task 1.7). Fetches `GET /dashboard` and
 * renders one card per figure the API returned — computing nothing client-side
 * and assuming no figure the response omitted. Owns the loading / empty / error
 * states the screen requires; a super admin switching branch re-fetches because
 * the hook folds the active branch into its query key.
 */

import * as React from "react"
import { LayoutDashboard, ShieldAlert } from "lucide-react"

import { isForbiddenError } from "@/lib/api"
import { getErrorMessage } from "@/lib/toast"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { useDashboard } from "@/hooks/dashboard/use-dashboard"
import { toDashboardCards } from "./figures"
import { SummaryCard, SummaryCardSkeleton } from "./summary-card"

const GRID =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

export function DashboardSummary() {
  const { data, isPending, isError, error, refetch } = useDashboard()

  if (isPending) {
    return (
      <div className={GRID} aria-busy>
        {Array.from({ length: 8 }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    // A 403 here means the account simply has no dashboard figures to see —
    // surface that distinctly from a transient failure (which offers a retry).
    if (isForbiddenError(error)) {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="No dashboard access"
          description="Your account doesn't have access to dashboard figures."
        />
      )
    }
    return (
      <ErrorPanel
        title="Couldn't load the dashboard"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    )
  }

  const cards = toDashboardCards(data)

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No figures to show"
        description="There are no summary figures for your account in this scope yet."
      />
    )
  }

  return (
    <div className={GRID}>
      {cards.map((card) => (
        <SummaryCard key={card.key} card={card} />
      ))}
    </div>
  )
}
