"use client"

/**
 * Column-bar charts for the report views (imported "Reports" design,
 * `ui-context.md` §10). Bars are pure layout geometry — heights are `ratios()`
 * of the API magnitudes, and every readable figure lives in the tooltip / axis
 * as the API's own string.
 */

import { cn } from "@workspace/ui/lib/utils"
import { ratios } from "./report-primitives"

/** Accent / soft dot legend for the multi-series charts. */
export function ChartLegend({
  items,
}: {
  items: { label: string; className: string }[]
}) {
  return (
    <div className="flex items-center gap-3.5 text-xs font-medium text-copy-secondary">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", it.className)} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

export interface OverlayPoint {
  label: string
  /** Backdrop magnitude (e.g. billed). */
  total: number
  /** Fill magnitude, ≤ total (e.g. collected). */
  filled: number
  tip?: string
}

/** A `bg-chart-bar` fill nested inside a `bg-chart-bar-soft` backdrop. */
export function OverlayBarChart({
  data,
  height = 180,
}: {
  data: OverlayPoint[]
  height?: number
}) {
  const fr = ratios(data.map((d) => d.total))
  return (
    <div
      className="grid items-end gap-2.5"
      style={{
        height,
        gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
      }}
    >
      {data.map((d, i) => {
        // Inner fill is a fraction of the (billed) backdrop it sits inside.
        const inner = d.total > 0 ? Math.min(d.filled / d.total, 1) : 0
        return (
          <div
            key={`${d.label}-${i}`}
            className="flex h-full flex-col items-center justify-end gap-1.5"
            title={d.tip}
          >
            <div
              className="flex w-full max-w-[26px] items-end rounded-t-[6px] bg-chart-bar-soft"
              style={{ height: `${Math.max((fr[i] ?? 0) * 100, 2)}%` }}
            >
              <div
                className="w-full rounded-t-[6px] bg-chart-bar"
                style={{ height: `${Math.round(inner * 100)}%` }}
              />
            </div>
            <span className="text-[10.5px] font-semibold text-copy-muted">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
