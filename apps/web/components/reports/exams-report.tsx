"use client"

/**
 * Exam Results tab (imported "Reports" design): exam-type chips, a grade
 * distribution, and per-class performance (appeared / passed / avg GPA / pass
 * rate). Every figure is the API's; the client only orders grades and scales
 * the distribution bars.
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
import { useExamsReport } from "@/hooks/reports/use-analytics"
import type { AnalyticsQuery } from "@/types/analytics"
import {
  Chip,
  GradeBars,
  NUM_CELL,
  Panel,
  PanelTable,
  ReportEmpty,
  ReportState,
  StatusPill,
  ratios,
} from "./report-primitives"

/** Canonical grade order (best → worst) so bars read top-down like the design. */
const GRADE_RANK: Record<string, number> = {
  "A+": 0,
  A: 1,
  "A-": 2,
  "A−": 2,
  B: 3,
  C: 4,
  D: 5,
  F: 6,
}

function gradeRank(grade: string): number {
  return GRADE_RANK[grade] ?? 99
}

function passRateTone(rate: number): "success" | "accent" | "warning" {
  if (rate >= 95) return "success"
  if (rate >= 88) return "accent"
  return "warning"
}

export function ExamsReport({ query }: { query: AnalyticsQuery }) {
  const [examType, setExamType] = React.useState<string | null>(null)
  const result = useExamsReport(query, examType)
  const data = result.data

  const active = examType ?? data?.selected ?? null
  const activeLabel =
    data?.exams.find((e) => e.type === active)?.label ?? ""

  const grades = React.useMemo(() => {
    if (!data) return []
    const sorted = [...data.grade_distribution].sort(
      (a, b) => gradeRank(a.grade) - gradeRank(b.grade)
    )
    const fr = ratios(sorted.map((g) => g.count))
    return sorted.map((g, i) => ({ ...g, ratio: fr[i] ?? 0 }))
  }, [data])

  return (
    <ReportState
      isLoading={result.isLoading}
      isError={result.isError}
      onRetry={() => result.refetch()}
    >
      {data ? (
        <div className="flex flex-col gap-5">
          {data.exams.length === 0 ? (
            <ReportEmpty message="No exams for this session yet." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {data.exams.map((e) => (
                  <Chip
                    key={e.type}
                    active={active === e.type}
                    onClick={() => setExamType(e.type)}
                  >
                    {e.label}
                  </Chip>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1.5fr]">
                <Panel
                  title="Grade distribution"
                  description={`${activeLabel} · all classes`}
                >
                  {grades.length === 0 ? (
                    <ReportEmpty message="No published results for this exam." />
                  ) : (
                    <GradeBars grades={grades} />
                  )}
                </Panel>

                <Panel title="Class performance" flush>
                  {data.class_performance.length === 0 ? (
                    <div className="px-[22px] pb-5">
                      <ReportEmpty message="No published results for this exam." />
                    </div>
                  ) : (
                    <PanelTable>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead className="text-right">Appeared</TableHead>
                            <TableHead className="text-right">Passed</TableHead>
                            <TableHead className="text-right">Avg GPA</TableHead>
                            <TableHead className="text-right">Pass rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.class_performance.map((row, i) => (
                            <TableRow key={`${row.class}-${i}`}>
                              <TableCell className="font-semibold text-copy-primary">
                                {row.class}
                              </TableCell>
                              <TableCell className={`${NUM_CELL} text-copy-secondary`}>
                                {row.appeared}
                              </TableCell>
                              <TableCell className={`${NUM_CELL} text-copy-secondary`}>
                                {row.passed}
                              </TableCell>
                              <TableCell className={`${NUM_CELL} font-semibold`}>
                                {row.avg_gpa.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <StatusPill tone={passRateTone(row.pass_rate)}>
                                  {row.pass_rate}%
                                </StatusPill>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </PanelTable>
                  )}
                </Panel>
              </div>
            </>
          )}
        </div>
      ) : null}
    </ReportState>
  )
}
