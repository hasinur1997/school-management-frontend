"use client"

/**
 * Attendance tab (imported "Reports" design): a Students / Teachers toggle, a
 * present-rate-by-month chart, and a per-class (students) or per-teacher
 * breakdown of average present rate and absent days. Rates are the API's.
 */

import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { useAttendanceReport } from "@/hooks/reports/use-analytics"
import type { AnalyticsQuery, AttendanceMode } from "@/types/analytics"
import {
  Chip,
  NUM_CELL,
  Panel,
  PanelTable,
  ReportEmpty,
  ReportState,
  formatMonthShort,
} from "./report-primitives"

/** Present rate → bar/text colour. */
function rateColor(rate: number): string {
  if (rate >= 92) return "bg-success"
  if (rate >= 87) return "bg-chart-bar"
  return "bg-error"
}

function rateText(rate: number): string {
  if (rate >= 92) return "text-success"
  if (rate >= 87) return "text-copy-primary"
  return "text-error"
}

export function AttendanceReport({ query }: { query: AnalyticsQuery }) {
  const [mode, setMode] = React.useState<AttendanceMode>("students")
  const result = useAttendanceReport(query, mode)
  const data = result.data

  const isStudents = mode === "students"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Chip active={isStudents} onClick={() => setMode("students")}>
          Students
        </Chip>
        <Chip active={!isStudents} onClick={() => setMode("teachers")}>
          Teachers
        </Chip>
      </div>

      <ReportState
        isLoading={result.isLoading}
        isError={result.isError}
        onRetry={() => result.refetch()}
      >
        {data ? (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title={isStudents ? "Student attendance" : "Teacher attendance"}
              description={`Present rate by month, session ${data.filters.session ?? ""}`}
            >
              {data.by_month.length === 0 ? (
                <ReportEmpty message="No attendance recorded this session." />
              ) : (
                <div
                  className="grid items-end gap-2.5"
                  style={{
                    height: 170,
                    gridTemplateColumns: `repeat(${data.by_month.length}, minmax(0, 1fr))`,
                  }}
                >
                  {data.by_month.map((m) => (
                    <div
                      key={m.month}
                      className="flex h-full flex-col items-center justify-end gap-1.5"
                      title={`${m.month}: ${m.rate}% present`}
                    >
                      <span className="font-mono text-[10px] font-semibold text-copy-secondary">
                        {m.rate}
                      </span>
                      <div
                        className={cn(
                          "w-full max-w-[26px] rounded-t-[6px]",
                          rateColor(m.rate)
                        )}
                        // Design scales 60–100% present across the full height.
                        style={{
                          height: `${Math.min(Math.max(((m.rate - 60) / 40) * 100, 2), 100)}%`,
                        }}
                      />
                      <span className="text-[10.5px] font-semibold text-copy-muted">
                        {formatMonthShort(m.month)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={isStudents ? "By class" : "By teacher"} flush>
              {data.rows.length === 0 ? (
                <div className="px-[22px] pb-5">
                  <ReportEmpty message="No records for this period." />
                </div>
              ) : (
                <PanelTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isStudents ? "Class" : "Teacher"}</TableHead>
                        <TableHead className="text-right">Avg present</TableHead>
                        <TableHead className="text-right">Absent days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row, i) => (
                        <TableRow key={`${row.name}-${i}`}>
                          <TableCell className="font-semibold text-copy-primary">
                            {row.name}
                          </TableCell>
                          <TableCell
                            className={`${NUM_CELL} font-semibold ${rateText(row.rate)}`}
                          >
                            {row.rate}%
                          </TableCell>
                          <TableCell className={`${NUM_CELL} text-copy-secondary`}>
                            {row.absent_days}
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
    </div>
  )
}
