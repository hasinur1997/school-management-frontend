"use client"

/**
 * Class/section monthly attendance sheet (task 3.2) — the "Monthly Attendance"
 * design: a pivot of the class roster (rows, in roll order) against every day of
 * the month (columns), each cell a status badge. The leading column pins the
 * student (avatar + name + roll); the trailing column shows the month's
 * attendance percentage. Built from `GET /attendance` — the grid is a pure
 * reshape; the only derived figure is the per-row % the design surfaces, which
 * has no API total to defer to (`feature-specs/10`, Rules).
 *
 * Because the browse endpoint has no month filter, only students with at least
 * one mark in the month appear; the empty state explains the setup/no-data
 * cases.
 */

import * as React from "react"
import { CalendarRange, Download, TriangleAlert, Users } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { ClassSelect, SectionSelect } from "@/components/academic"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { TableSkeleton } from "@/components/skeletons"
import { statusTone, type StatusTone } from "@/components/status-badge"
import { useClasses, useSections } from "@/hooks/academic"
import { useClassAttendanceMonth } from "@/hooks/attendance"
import { getErrorMessage } from "@/lib/toast"
import {
  currentMonth,
  isoDate,
  isToday,
  isWeekend,
  monthLabel,
  weekdayOf,
} from "@/lib/attendance/month"
import type { PaginationMeta } from "@/types/api"
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  type AttendanceStatusValue,
} from "@/types/attendance"
import { MonthYearPicker } from "./month-year-picker"

/** Roster rows shown per page — matches the attendance entry table. */
const ROW_PAGE_SIZE = 10

/** Single-letter day-of-week headers, indexed by `Date.getDay()`. */
const DOW_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const

/** One-letter cell glyph per status; full label is the cell's title/legend. */
const STATUS_ABBR: Record<AttendanceStatusValue, string> = {
  present: "P",
  absent: "A",
  late: "L",
  leave: "E",
}

/** Statuses that count as attended when deriving the month's percentage. */
const ATTENDED: ReadonlySet<AttendanceStatusValue> = new Set([
  "present",
  "late",
])

/** Column highlight applied top-to-bottom to today's date, so it stands out. */
const TODAY_COL = "border-x-2 border-x-brand bg-brand/[0.07]"

/** Background/border/text tint per status tone, shared by cells and legend. */
const TONE_TINT: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-surface-border bg-subtle text-copy-secondary",
}

/** Two-letter initials from a name, for the avatar fallback. */
function initialsOf(name: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
  }
  return (name ?? "—").slice(0, 2).toUpperCase()
}

export function ClassAttendanceSheet() {
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)
  const [period, setPeriod] = React.useState(currentMonth)

  const query = useClassAttendanceMonth({
    classId,
    sectionId,
    year: period.year,
    month: period.month,
  })

  const { data: classes } = useClasses()
  const { data: sections } = useSections(classId)

  const className =
    classes?.find((c) => c.id === classId)?.name ?? null
  const sectionName =
    sections?.find((s) => s.id === sectionId)?.name ?? null

  const isReady = classId != null && sectionId != null
  const sheet = query.data

  const scope =
    isReady && className
      ? `${className}${sectionName ? ` — Section ${sectionName}` : ""} · ${monthLabel(period.year, period.month)}`
      : `Select a class and section · ${monthLabel(period.year, period.month)}`

  function changeClass(value: string | null) {
    setClassId(value)
    setSectionId(null)
  }

  function exportCsv() {
    if (!sheet || sheet.rows.length === 0) return
    const header = [
      "Roll",
      "Student",
      ...sheet.days.map(String),
      "Attendance %",
    ]
    const lines = sheet.rows.map((row) => {
      const cells = sheet.days.map((day) => {
        const status = row.marks[isoDate(sheet.year, sheet.month, day)]
        return status ? STATUS_ABBR[status] : ""
      })
      return [row.roll_no ?? "", row.name_en ?? "", ...cells, `${rowPercent(row, sheet)}`]
    })
    const csv = [header, ...lines]
      .map((cols) => cols.map(csvField).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `attendance-${sheet.year}-${String(sheet.month).padStart(2, "0")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-copy-primary">
            Monthly Attendance
          </h2>
          <p className="mt-1 truncate text-sm text-copy-muted">{scope}</p>
        </div>
        <Button
          variant="default"
          onClick={exportCsv}
          disabled={!sheet || sheet.rows.length === 0}
          className="shrink-0"
        >
          <Download className="size-4" aria-hidden />
          Export sheet
        </Button>
      </div>

      {/* Toolbar: class/section + month nav, with the status legend. */}
      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <ClassSelect
            value={classId}
            onValueChange={changeClass}
            aria-label="Select class"
            className="w-40"
          />
          <SectionSelect
            classId={classId}
            value={sectionId}
            onValueChange={setSectionId}
            aria-label="Select section"
            className="w-40"
          />
          <MonthYearPicker
            year={period.year}
            month={period.month}
            onChange={setPeriod}
            disabled={query.isFetching}
          />
        </div>

        <Legend />
      </div>

      {!isReady ? (
        <EmptyState
          icon={CalendarRange}
          title="Choose a class and section"
          description="The monthly sheet loads once a class and section are selected."
        />
      ) : query.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : query.isError ? (
        <ErrorPanel
          description={getErrorMessage(
            query.error,
            "We couldn't load the class attendance sheet."
          )}
          onRetry={query.refetch}
        />
      ) : sheet && sheet.rows.length > 0 ? (
        <SheetTable
          key={`${classId}-${sectionId}-${period.year}-${period.month}`}
          sheet={sheet}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No attendance this month"
          description="No attendance has been recorded for this section in the selected month."
        />
      )}
    </div>
  )
}

type Sheet = NonNullable<ReturnType<typeof useClassAttendanceMonth>["data"]>

/** Month attendance % for a row: attended (present/late) ÷ days with a mark. */
function rowPercent(row: Sheet["rows"][number], sheet: Sheet): number {
  let marked = 0
  let attended = 0
  for (const status of Object.values(row.marks)) {
    marked++
    if (ATTENDED.has(status)) attended++
  }
  return marked === 0 ? 0 : Math.round((attended / marked) * 100)
}

function SheetTable({ sheet }: { sheet: Sheet }) {
  const total = sheet.rows.length
  const lastPage = Math.max(1, Math.ceil(total / ROW_PAGE_SIZE))
  const [page, setPage] = React.useState(1)

  // The component is remounted (keyed on the roster identity) when the
  // section/month changes, so page state resets without a set-state effect.
  const safePage = Math.min(page, lastPage)
  const start = (safePage - 1) * ROW_PAGE_SIZE
  const end = start + ROW_PAGE_SIZE
  const pageRows = sheet.rows.slice(start, end)

  // Precompute each column's weekday/weekend/today flags once for the table.
  const columns = React.useMemo(
    () =>
      sheet.days.map((day) => {
        const weekday = weekdayOf(sheet.year, sheet.month, day)
        return {
          day,
          dow: DOW_LETTERS[weekday],
          weekend: isWeekend(weekday),
          today: isToday(sheet.year, sheet.month, day),
        }
      }),
    [sheet.days, sheet.year, sheet.month]
  )

  // Section-wide present/absent tally per date column (all rows, not just the
  // current page) for the top/bottom totals rows the design surfaces.
  const dayTotals = React.useMemo(() => {
    const present = new Map<number, number>()
    const absent = new Map<number, number>()
    for (const day of sheet.days) {
      const iso = isoDate(sheet.year, sheet.month, day)
      let p = 0
      let a = 0
      for (const row of sheet.rows) {
        const status = row.marks[iso]
        if (status === "present") p++
        else if (status === "absent") a++
      }
      present.set(day, p)
      absent.set(day, a)
    }
    return { present, absent }
  }, [sheet.days, sheet.rows, sheet.year, sheet.month])

  const pagerMeta: PaginationMeta = {
    current_page: safePage,
    per_page: ROW_PAGE_SIZE,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(end, total),
    total,
    last_page: lastPage,
  }

  return (
    <div className="flex flex-col gap-3">
      {sheet.truncated ? (
        <p className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          Showing a partial month — this section has a large attendance history.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-max border-separate border-spacing-0 [font-variant-numeric:tabular-nums]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 h-12 w-60 min-w-60 border-b border-r border-surface-border bg-subtle px-5 text-xs font-semibold uppercase tracking-wide text-copy-muted">
                  Student
                </TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col.day}
                    aria-current={col.today ? "date" : undefined}
                    className={cn(
                      "h-12 w-9 min-w-9 border-b border-r border-surface-border px-0 text-center",
                      col.today
                        ? cn(TODAY_COL, "border-t-2 border-t-brand")
                        : col.weekend
                          ? "bg-base"
                          : "bg-subtle"
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5 leading-none">
                      <span
                        className={cn(
                          "tabular-nums",
                          col.today
                            ? "grid size-5 place-items-center rounded-full bg-brand text-[12px] font-bold text-white"
                            : cn(
                                "text-[13px] font-bold",
                                col.weekend
                                  ? "text-copy-muted"
                                  : "text-copy-primary"
                              )
                        )}
                      >
                        {col.day}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase",
                          col.today ? "text-brand" : "text-copy-muted"
                        )}
                      >
                        {col.dow}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 z-20 h-12 w-24 min-w-24 border-b border-l border-surface-border bg-subtle px-4 text-right text-xs font-semibold uppercase tracking-wide text-copy-muted">
                  Att %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TotalsRow
                label="Present"
                tone="success"
                columns={columns}
                counts={dayTotals.present}
              />
              <TotalsRow
                label="Absent"
                tone="error"
                columns={columns}
                counts={dayTotals.absent}
              />
              {pageRows.map((row) => {
                const pct = rowPercent(row, sheet)
                const pctTone: StatusTone =
                  pct >= 90 ? "success" : pct >= 75 ? "warning" : "error"
                return (
                  <TableRow key={row.enrollment_id} className="hover:bg-transparent">
                    <TableCell className="sticky left-0 z-10 w-60 min-w-60 border-b border-r border-surface-border bg-surface px-5 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-surface-border bg-subtle text-xs font-semibold text-copy-secondary">
                          {initialsOf(row.name_en)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-copy-primary">
                            {row.name_en || "—"}
                          </div>
                          <div className="text-xs text-copy-muted">
                            Roll {row.roll_no ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {columns.map((col) => (
                      <DayStatusCell
                        key={col.day}
                        status={row.marks[isoDate(sheet.year, sheet.month, col.day)]}
                        weekend={col.weekend}
                        today={col.today}
                      />
                    ))}
                    <TableCell className="sticky right-0 z-10 w-24 min-w-24 border-b border-l border-surface-border bg-surface px-4 py-2.5 text-right">
                      <span
                        className={cn(
                          "text-[13px] font-bold tabular-nums",
                          pctTone === "success"
                            ? "text-success"
                            : pctTone === "warning"
                              ? "text-warning"
                              : "text-error"
                        )}
                      >
                        {pct}%
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-surface-border px-5 py-3.5">
          <ListPager
            meta={pagerMeta}
            page={safePage}
            lastPage={lastPage}
            unit="student"
            onPage={setPage}
          />
        </div>
      </div>
    </div>
  )
}

function DayStatusCell({
  status,
  weekend,
  today,
}: {
  status: AttendanceStatusValue | undefined
  weekend: boolean
  today: boolean
}) {
  if (!status) {
    return (
      <TableCell
        className={cn(
          "border-b border-r border-surface-border px-0 text-center text-copy-muted",
          today ? TODAY_COL : weekend && "bg-base"
        )}
      >
        ·
      </TableCell>
    )
  }

  return (
    <TableCell
      className={cn(
        "border-b border-r border-surface-border px-0 text-center",
        today && TODAY_COL
      )}
      title={attendanceStatusLabel(status)}
    >
      <span
        className={cn(
          "inline-grid size-6 place-items-center rounded-md border text-[11px] font-semibold",
          TONE_TINT[statusTone(status)]
        )}
      >
        {STATUS_ABBR[status]}
      </span>
    </TableCell>
  )
}

/**
 * Section-wide per-date tally row, pinned above (Present) and below (Absent) the
 * roster. The leading/trailing cells mirror the sticky student/percentage
 * columns; each day cell shows its count tinted by the row's tone.
 */
function TotalsRow({
  label,
  tone,
  columns,
  counts,
}: {
  label: string
  tone: StatusTone
  columns: { day: number; weekend: boolean; today: boolean }[]
  counts: Map<number, number>
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        className={cn(
          "sticky left-0 z-10 w-60 min-w-60 border-b border-r border-surface-border bg-subtle px-5 py-2 text-xs font-semibold uppercase tracking-wide",
          tone === "success" ? "text-success" : "text-error"
        )}
      >
        {label}
      </TableCell>
      {columns.map((col) => {
        const count = counts.get(col.day) ?? 0
        return (
          <TableCell
            key={col.day}
            className={cn(
              "border-b border-r border-surface-border px-0 py-2 text-center",
              col.today ? TODAY_COL : col.weekend && "bg-base"
            )}
          >
            <span
              className={cn(
                "text-[15px] font-extrabold tabular-nums",
                count === 0
                  ? "text-copy-muted"
                  : tone === "success"
                    ? "text-success"
                    : "text-error"
              )}
            >
              {count}
            </span>
          </TableCell>
        )
      })}
      <TableCell className="sticky right-0 z-10 w-24 min-w-24 border-b border-l border-surface-border bg-subtle px-4" />
    </TableRow>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {ATTENDANCE_STATUSES.map((status) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-copy-muted"
        >
          <span
            className={cn(
              "inline-grid size-6 place-items-center rounded-md border text-[11px] font-semibold",
              TONE_TINT[statusTone(status)]
            )}
          >
            {STATUS_ABBR[status]}
          </span>
          {attendanceStatusLabel(status)}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-copy-muted">
        <span className="inline-grid size-6 place-items-center rounded-md border border-surface-border bg-base text-[11px] font-semibold text-copy-muted">
          ·
        </span>
        Holiday
      </span>
    </div>
  )
}

/** Quote a CSV field when it contains a comma, quote, or newline. */
function csvField(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}
