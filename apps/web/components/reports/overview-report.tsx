"use client"

/**
 * Overview tab (imported "Reports" design): four headline KPIs with vs-last-
 * period deltas, a fee-collection-by-month chart, an attendance-this-period
 * snapshot with teachers-present-today, and the highest outstanding dues. Every
 * figure is the API's — the client only renders and scales bars.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { useOverviewReport } from "@/hooks/reports/use-analytics"
import type { AnalyticsQuery } from "@/types/analytics"
import {
  KpiCard,
  KpiGrid,
  NUM_CELL,
  Panel,
  PanelTable,
  ReportEmpty,
  ReportState,
  StatusPill,
  formatMonthLong,
  formatMonthShort,
  formatMoney,
  toNumber,
  type Tone,
} from "./report-primitives"
import { ChartLegend, OverlayBarChart } from "./report-charts"

/** Attendance rate → meter tone (green ≥ 92, accent ≥ 87, else red). */
function rateTone(rate: number): Tone {
  if (rate >= 92) return "positive"
  if (rate >= 87) return "accent"
  return "negative"
}

const RATE_FILL: Record<Tone, string> = {
  default: "bg-chart-bar",
  positive: "bg-success",
  negative: "bg-error",
  accent: "bg-chart-bar",
  warning: "bg-warning",
}

export function OverviewReport({
  query,
  rangeLabel,
  onGoFees,
}: {
  query: AnalyticsQuery
  rangeLabel: string
  onGoFees: () => void
}) {
  const result = useOverviewReport(query)
  const data = result.data

  return (
    <ReportState
      isLoading={result.isLoading}
      isError={result.isError}
      onRetry={() => result.refetch()}
    >
      {data ? (
        <div className="flex flex-col gap-5">
          <KpiGrid>
            <KpiCard
              label={`Collected (${rangeLabel})`}
              value={data.kpis.collected.value}
              kind="currency"
              delta={data.kpis.collected.delta}
            />
            <KpiCard
              label="Outstanding dues"
              value={data.kpis.outstanding.value}
              kind="currency"
              delta={data.kpis.outstanding.delta}
            />
            <KpiCard
              label="Avg student attendance"
              value={`${data.kpis.attendance_rate.value}%`}
              kind="raw"
              delta={data.kpis.attendance_rate.delta}
            />
            <KpiCard
              label="New admissions"
              value={data.kpis.new_admissions.value}
              kind="count"
              delta={data.kpis.new_admissions.delta}
            />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.6fr_1fr]">
            <Panel
              title="Fee collection by month"
              description={`Collected vs billed, session ${data.filters.session ?? ""}`}
              action={
                <ChartLegend
                  items={[
                    { label: "Collected", className: "bg-chart-bar" },
                    { label: "Billed", className: "bg-chart-bar-soft" },
                  ]}
                />
              }
            >
              {data.fee_collection.length === 0 ? (
                <ReportEmpty message="No invoices billed this session." />
              ) : (
                <OverlayBarChart
                  data={data.fee_collection.map((m) => ({
                    label: formatMonthShort(m.month),
                    total: toNumber(m.billed),
                    filled: toNumber(m.collected),
                    tip: `${formatMonthLong(m.month)}: ${formatMoney(m.collected)} collected of ${formatMoney(m.billed)} billed`,
                  }))}
                />
              )}
            </Panel>

            <Panel
              title="Attendance this month"
              description="Average present rate"
            >
              <div className="flex flex-col gap-3.5">
                {data.attendance_snapshot.length === 0 ? (
                  <ReportEmpty message="No attendance recorded." />
                ) : (
                  data.attendance_snapshot.slice(0, 5).map((a) => {
                    const tone = rateTone(a.rate)
                    return (
                      <div key={a.class} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between text-[13px]">
                          <span className="font-semibold text-copy-primary">
                            {a.class}
                          </span>
                          <span
                            className={cn(
                              "font-mono font-semibold tabular-nums",
                              tone === "positive"
                                ? "text-success"
                                : tone === "negative"
                                  ? "text-error"
                                  : "text-brand"
                            )}
                          >
                            {a.rate}%
                          </span>
                        </div>
                        <div className="h-[7px] overflow-hidden rounded-full bg-chart-track">
                          <div
                            className={cn("h-full rounded-full", RATE_FILL[tone])}
                            style={{ width: `${a.rate}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-surface-border-subtle pt-2.5 text-[12.5px] text-copy-secondary">
                <span>Teachers present today</span>
                <span className="font-mono font-bold text-copy-primary tabular-nums">
                  {data.teachers_today.present} / {data.teachers_today.total}
                </span>
              </div>
            </Panel>
          </div>

          <Panel
            title="Highest outstanding dues"
            action={
              <button
                type="button"
                onClick={onGoFees}
                className="text-[13px] font-semibold text-brand hover:opacity-80"
              >
                View fees report →
              </button>
            }
            flush
          >
            {data.top_dues.length === 0 ? (
              <div className="px-[22px] pb-5">
                <ReportEmpty message="No outstanding dues — everything's collected." />
              </div>
            ) : (
              <PanelTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Oldest invoice</TableHead>
                      <TableHead className="text-right">Months due</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_dues.map((row, i) => (
                      <TableRow key={`${row.student}-${i}`}>
                        <TableCell className="font-semibold text-copy-primary">
                          {row.student}
                        </TableCell>
                        <TableCell className="text-copy-secondary">
                          {row.class}
                        </TableCell>
                        <TableCell className="font-mono text-[12.5px] text-copy-secondary">
                          {row.oldest_invoice}
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusPill tone="warning">
                            {row.months_due} mo
                          </StatusPill>
                        </TableCell>
                        <TableCell
                          className={`${NUM_CELL} font-semibold text-copy-primary`}
                        >
                          {formatMoney(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PanelTable>
            )}
          </Panel>
        </div>
      ) : null}
    </ReportState>
  )
}
