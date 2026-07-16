"use client"

/**
 * Fees & Collections tab (imported "Reports" design): billed / collected /
 * overdue KPIs and a per-class table with an inline collection-rate meter. All
 * money is the API's decimal string; the rate is the server's per-class figure.
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
import { useFeesCollectionReport } from "@/hooks/reports/use-analytics"
import {
  PAYMENT_STATUS_LABELS,
  type AnalyticsQuery,
  type PaymentStatus,
} from "@/types/analytics"
import {
  KpiCard,
  KpiGrid,
  NUM_CELL,
  Panel,
  PanelTable,
  ReportEmpty,
  ReportState,
  formatMoney,
} from "./report-primitives"

/** Inline collection-rate meter for a class row. */
function RateCell({ rate }: { rate: number }) {
  const fill = rate >= 90 ? "bg-success" : rate >= 75 ? "bg-chart-bar" : "bg-error"
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-chart-track">
        <span
          className={cn("block h-full rounded-full", fill)}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-mono text-[12.5px] font-semibold tabular-nums">
        {rate}%
      </span>
    </div>
  )
}

export function FeesCollectionReport({
  query,
  rangeLabel,
}: {
  query: AnalyticsQuery
  rangeLabel: string
}) {
  const result = useFeesCollectionReport(query)
  const data = result.data

  const scopeLabel = data
    ? `${data.filters.class} · ${rangeLabel} · ${
        PAYMENT_STATUS_LABELS[
          data.filters.payment_status as PaymentStatus
        ]?.toLowerCase() ?? data.filters.payment_status
      }`
    : ""

  return (
    <ReportState
      isLoading={result.isLoading}
      isError={result.isError}
      onRetry={() => result.refetch()}
    >
      {data ? (
        <div className="flex flex-col gap-5">
          <KpiGrid className="max-w-[820px] lg:grid-cols-3">
            <KpiCard label="Total billed" value={data.totals.billed} kind="currency" />
            <KpiCard
              label="Collected"
              value={data.totals.collected}
              kind="currency"
              tone="positive"
            />
            <KpiCard
              label="Overdue"
              value={data.totals.overdue}
              kind="currency"
              tone="warning"
            />
          </KpiGrid>

          <Panel title="Collection by class" description={scopeLabel} flush>
            {data.by_class.length === 0 ? (
              <div className="px-[22px] pb-5">
                <ReportEmpty message="No invoices billed for this period." />
              </div>
            ) : (
              <PanelTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead className="w-[200px]">Collection rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_class.map((row, i) => (
                      <TableRow key={`${row.class}-${i}`}>
                        <TableCell className="font-semibold text-copy-primary">
                          {row.class}
                        </TableCell>
                        <TableCell className={`${NUM_CELL} text-copy-secondary`}>
                          {formatMoney(row.billed)}
                        </TableCell>
                        <TableCell className={`${NUM_CELL} font-semibold`}>
                          {formatMoney(row.collected)}
                        </TableCell>
                        <TableCell className={`${NUM_CELL} font-semibold text-warning`}>
                          {formatMoney(row.due)}
                        </TableCell>
                        <TableCell>
                          <RateCell rate={row.rate} />
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
