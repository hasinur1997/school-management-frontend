import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Card } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { formatCount, formatMoney } from "@/lib/format"
import type { DashboardCard } from "./figures"

/**
 * One dashboard summary figure: label, formatted value, and a glyph. Money uses
 * the money formatter (decimal strings, no float math) and counts use grouped
 * tabular figures; both render with the mono/tabular font so values align across
 * the grid (`ui-context.md`, Currency/Numbers).
 */
export function SummaryCard({ card }: { card: DashboardCard }) {
  const Icon = card.icon
  const display =
    card.kind === "currency" ? formatMoney(card.value) : formatCount(card.value)

  return (
    <Card className="flex-row items-center justify-between gap-4 px-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="truncate text-sm font-medium text-copy-muted">
          {card.label}
        </p>
        <p
          className="truncate font-mono text-2xl font-semibold tabular-nums text-copy-primary"
          title={display}
        >
          {display}
        </p>
      </div>
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-brand"
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
    </Card>
  )
}

/** Skeleton mirroring `SummaryCard` for the initial-load grid. */
export function SummaryCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn("flex-row items-center justify-between gap-4 px-4", className)}
      aria-busy
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-20" />
      </div>
      <Skeleton className="size-11 rounded-lg" />
    </Card>
  )
}
