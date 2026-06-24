"use client"

/**
 * Presentational monthly attendance sheet (task 3.2): the API's summary counts
 * as colour-coded tiles plus a calendar grid of the month with each recorded
 * day tinted by its status. Totals are taken verbatim from the API — nothing is
 * recomputed here. Shared by the per-student, self, and parent/child views.
 */

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { EmptyState } from "@/components/empty-state"
import { CalendarOff } from "lucide-react"
import { statusTone, type StatusTone } from "@/components/status-badge"
import {
  daysInMonth,
  firstWeekday,
  isoDate,
} from "@/lib/attendance/month"
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  type AttendanceStatusValue,
  type MonthlyAttendance,
} from "@/types/attendance"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** Background/border/text tint per status tone, reused by tiles and day cells. */
const TONE_TINT: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-surface-border bg-subtle text-copy-secondary",
}

export function MonthlySheetView({ data }: { data: MonthlyAttendance }) {
  const totalDays = daysInMonth(data.year, data.month)
  const leading = firstWeekday(data.year, data.month)

  const byDate = React.useMemo(() => {
    const map = new Map<string, AttendanceStatusValue>()
    for (const day of data.days) map.set(day.date, day.status)
    return map
  }, [data.days])

  return (
    <div className="flex flex-col gap-4">
      <SummaryTiles data={data} />

      {data.days.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No attendance recorded"
          description="No attendance has been taken for this student in the selected month."
        />
      ) : (
        <div className="rounded-xl border border-surface-border bg-surface p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="pb-1 text-center text-xs font-medium text-copy-muted"
              >
                {weekday}
              </div>
            ))}
            {Array.from({ length: leading }, (_, index) => (
              <div key={`pad-${index}`} aria-hidden />
            ))}
            {Array.from({ length: totalDays }, (_, index) => {
              const day = index + 1
              const status = byDate.get(isoDate(data.year, data.month, day))
              return <DayCell key={day} day={day} status={status} />
            })}
          </div>

          <Legend />
        </div>
      )}
    </div>
  )
}

function DayCell({
  day,
  status,
}: {
  day: number
  status: AttendanceStatusValue | undefined
}) {
  const tint = status ? TONE_TINT[statusTone(status)] : null

  return (
    <div
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border p-1 text-center",
        tint ?? "border-dashed border-surface-border bg-base text-copy-muted"
      )}
      title={status ? attendanceStatusLabel(status) : undefined}
    >
      <span className="text-xs font-medium tabular-nums">{day}</span>
      {status ? (
        <span className="text-[0.65rem] font-semibold capitalize leading-none">
          {attendanceStatusLabel(status)}
        </span>
      ) : null}
    </div>
  )
}

function SummaryTiles({ data }: { data: MonthlyAttendance }) {
  const { summary } = data
  const tiles: { label: string; value: number; tone: StatusTone }[] = [
    { label: "Present", value: summary.present, tone: "success" },
    { label: "Absent", value: summary.absent, tone: "error" },
    { label: "Late", value: summary.late, tone: "warning" },
    { label: "Leave", value: summary.leave, tone: "info" },
    { label: "Working days", value: summary.working_days, tone: "neutral" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn(
            "flex flex-col gap-1 rounded-xl border p-3",
            TONE_TINT[tile.tone]
          )}
        >
          <span className="text-xs font-medium opacity-80">{tile.label}</span>
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {tile.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-surface-border pt-3">
      {ATTENDANCE_STATUSES.map((status) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 text-xs text-copy-muted"
        >
          <span
            className={cn(
              "size-2.5 rounded-full border",
              TONE_TINT[statusTone(status)]
            )}
            aria-hidden
          />
          {attendanceStatusLabel(status)}
        </span>
      ))}
    </div>
  )
}
