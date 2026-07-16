"use client"

/**
 * Expenses tab (imported "Reports" design): spent / collected / net KPIs, spend
 * by category, and the most recent expenses. All money is the API's decimal
 * string; the client only scales the category meters.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useExpensesReport } from "@/hooks/reports/use-analytics"
import type { AnalyticsQuery } from "@/types/analytics"
import {
  KpiCard,
  KpiGrid,
  MeterList,
  NUM_CELL,
  Panel,
  PanelTable,
  ReportEmpty,
  ReportState,
  StatusPill,
  formatMoney,
  ratios,
  toNumber,
} from "./report-primitives"

/** A negative money string reads as a loss. */
function isNegative(amount: string): boolean {
  return amount.trim().startsWith("-")
}

export function ExpensesReport({
  query,
  rangeLabel,
}: {
  query: AnalyticsQuery
  rangeLabel: string
}) {
  const result = useExpensesReport(query)
  const data = result.data

  const catRatios = data ? ratios(data.by_category.map((c) => toNumber(c.amount))) : []

  return (
    <ReportState
      isLoading={result.isLoading}
      isError={result.isError}
      onRetry={() => result.refetch()}
    >
      {data ? (
        <div className="flex flex-col gap-5">
          <KpiGrid className="max-w-[820px] lg:grid-cols-3">
            <KpiCard
              label={`Total spent (${rangeLabel})`}
              value={data.kpis.spent}
              kind="currency"
            />
            <KpiCard
              label="Collected (same period)"
              value={data.kpis.collected}
              kind="currency"
              tone="positive"
            />
            <KpiCard
              label="Net"
              value={data.kpis.net}
              kind="currency"
              tone={isNegative(data.kpis.net) ? "negative" : "positive"}
            />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1.4fr]">
            <Panel title="Spend by category" description={rangeLabel}>
              {data.by_category.length === 0 ? (
                <ReportEmpty message="No expenses recorded for this period." />
              ) : (
                <MeterList
                  meters={data.by_category.map((c, i) => ({
                    label: c.category,
                    value: formatMoney(c.amount),
                    ratio: catRatios[i] ?? 0,
                  }))}
                />
              )}
            </Panel>

            <Panel title="Recent expenses" flush>
              {data.recent.length === 0 ? (
                <div className="px-[22px] pb-5">
                  <ReportEmpty message="No expenses recorded for this period." />
                </div>
              ) : (
                <PanelTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent.map((row, i) => (
                        <TableRow key={`${row.voucher}-${i}`}>
                          <TableCell className="font-mono text-[12.5px] text-copy-secondary">
                            {row.voucher}
                          </TableCell>
                          <TableCell className="font-semibold text-copy-primary">
                            {row.description}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone="neutral">{row.category}</StatusPill>
                          </TableCell>
                          <TableCell className={`${NUM_CELL} font-semibold`}>
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
        </div>
      ) : null}
    </ReportState>
  )
}
