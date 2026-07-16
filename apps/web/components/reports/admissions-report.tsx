"use client"

/**
 * Admissions tab (imported "Reports" design): new-admissions / enrolled /
 * transfers-out KPIs, new admissions by month, and enrollment by class. All
 * counts are the API's; the client only scales the bars.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useAdmissionsReport } from "@/hooks/reports/use-analytics"
import type { AnalyticsQuery } from "@/types/analytics"
import {
  KpiCard,
  KpiGrid,
  NUM_CELL,
  Panel,
  PanelTable,
  ReportEmpty,
  ReportState,
  formatCount,
  formatMonthShort,
  ratios,
} from "./report-primitives"

export function AdmissionsReport({ query }: { query: AnalyticsQuery }) {
  const result = useAdmissionsReport(query)
  const data = result.data

  const barFractions = data ? ratios(data.by_month.map((m) => m.count)) : []

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
              label={`New admissions (${data.filters.session ?? ""})`}
              value={data.kpis.new_admissions}
              kind="count"
            />
            <KpiCard
              label="Total enrolled"
              value={data.kpis.total_enrolled}
              kind="count"
            />
            <KpiCard
              label="Transfers out"
              value={data.kpis.transfers_out}
              kind="count"
            />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title="New admissions by month"
              description="This session"
            >
              {data.by_month.length === 0 ? (
                <ReportEmpty message="No admissions this session." />
              ) : (
                <div
                  className="grid items-end gap-2.5"
                  style={{
                    height: 170,
                    gridTemplateColumns: `repeat(${data.by_month.length}, minmax(0, 1fr))`,
                  }}
                >
                  {data.by_month.map((m, i) => (
                    <div
                      key={m.month}
                      className="flex h-full flex-col items-center justify-end gap-1.5"
                      title={`${m.month}: ${m.count} new students`}
                    >
                      <span className="font-mono text-[10px] font-semibold text-copy-secondary">
                        {m.count}
                      </span>
                      <div
                        className="w-full max-w-[26px] rounded-t-[6px] bg-chart-bar"
                        style={{ height: `${Math.max((barFractions[i] ?? 0) * 100, 2)}%` }}
                      />
                      <span className="text-[10.5px] font-semibold text-copy-muted">
                        {formatMonthShort(m.month)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Enrollment by class" flush>
              {data.by_class.length === 0 ? (
                <div className="px-[22px] pb-5">
                  <ReportEmpty message="No enrollment for this session." />
                </div>
              ) : (
                <PanelTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Enrolled</TableHead>
                        <TableHead className="text-right">New this year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.by_class.map((row, i) => (
                        <TableRow key={`${row.class}-${i}`}>
                          <TableCell className="font-semibold text-copy-primary">
                            {row.class}
                          </TableCell>
                          <TableCell className={`${NUM_CELL} text-copy-secondary`}>
                            {formatCount(row.enrolled)}
                          </TableCell>
                          <TableCell className={`${NUM_CELL} font-semibold text-success`}>
                            +{formatCount(row.new)}
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
