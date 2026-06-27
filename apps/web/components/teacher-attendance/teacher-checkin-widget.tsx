"use client"

/**
 * Teacher self check-in / check-out (task 3.3), styled to the imported
 * "Teacher Attendance" Claude design. One screen, three regions:
 *
 *  - **Hero** — today's date with a live clock, the branch-network notice, the
 *    teacher's status / check-in / check-out facts, and a right-hand timer panel
 *    that counts elapsed time live until check-out. The action button swaps
 *    between Check in → Check out → Checked out. IP validation is entirely
 *    server-side; this only triggers the call. On rejection (a blocked network →
 *    403, or an already-done → 409) the API's reason is rendered verbatim in an
 *    inline banner, never masked (`task-3.3`, Behavior).
 *  - **History header** — month-navigable label + the shared `MonthYearPicker`.
 *  - **Lower grid** — a donut of the month's status breakdown beside the four
 *    summary tiles and the month's records (with a derived "Worked" column),
 *    read from `GET /me/teacher-attendance`.
 *
 * Today's record always reads the current month so it stays correct while the
 * history browses other months; the two share one query when the history is on
 * the current month.
 */

import * as React from "react"
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { StatusBadge, statusTone, type StatusTone } from "@/components/status-badge"
import { MonthYearPicker } from "@/components/attendance/month-year-picker"
import { currentMonth, isoDate, monthLabel } from "@/lib/attendance/month"
import { formatDate, formatTime } from "@/lib/format"
import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast"
import {
  useCheckIn,
  useCheckOut,
  useMyTeacherAttendance,
} from "@/hooks/teacher-attendance"
import {
  attendanceStatusLabel,
  type AttendanceStatusValue,
} from "@/types/attendance"
import type {
  TeacherAttendanceRecord,
  TeacherAttendanceSummary,
} from "@/types/teacher-attendance"

const EMPTY = "—"

/**
 * Shared sizing for the hero action button so Check in / Check out / Checked out
 * all occupy the same footprint (the design's 44px-tall pill) and the panel
 * never reflows as the state changes.
 */
const ACTION_BTN =
  "mt-1 h-11 min-w-[156px] justify-center gap-2 rounded-xl px-6 text-sm font-semibold"

/** Background/border/text tint per status tone, reused by the summary tiles. */
const TONE_TINT: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-surface-border bg-subtle text-copy-secondary",
}

/** Stroke colour per status tone for the donut, via the state-token CSS vars. */
const TONE_STROKE: Record<StatusTone, string> = {
  success: "var(--state-success)",
  warning: "var(--state-warning)",
  error: "var(--state-error)",
  info: "var(--state-info)",
  neutral: "var(--text-muted)",
}

/** A live `Date` that re-renders the subtree once per second (clock + timer). */
function useNow(active: boolean): Date {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

/** Milliseconds worked between two ISO stamps; `null` when either is missing. */
function workedMs(
  checkIn: string | null | undefined,
  end: string | Date | null | undefined
): number | null {
  if (!checkIn || !end) return null
  const start = new Date(checkIn).getTime()
  const finish = typeof end === "string" ? new Date(end).getTime() : end.getTime()
  if (Number.isNaN(start) || Number.isNaN(finish)) return null
  return Math.max(0, finish - start)
}

const pad = (n: number) => String(n).padStart(2, "0")

/** A short `8h 12m` duration for the table / total. */
function formatWorkedShort(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return `${h}h ${pad(m)}m`
}

export function TeacherCheckinWidget() {
  const today = React.useMemo(() => currentMonth(), [])
  const [month, setMonth] = React.useState(today)

  const todayQuery = useMyTeacherAttendance(today)
  const historyQuery = useMyTeacherAttendance(month)

  const todayIso = React.useMemo(() => {
    const now = new Date()
    return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }, [])

  const todayRecord =
    todayQuery.data?.records.find((r) => r.date === todayIso) ?? null

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-copy-primary">
          My attendance
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Check in and out for the day and review your history.
        </p>
      </div>

      <HeroCard
        isPending={todayQuery.isPending}
        isError={todayQuery.isError}
        onRetry={() => void todayQuery.refetch()}
        record={todayRecord}
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold tracking-tight text-copy-primary">
            History{" "}
            <span className="font-semibold text-copy-muted">
              · {monthLabel(month.year, month.month)}
            </span>
          </h2>
          <MonthYearPicker
            year={month.year}
            month={month.month}
            onChange={setMonth}
            disabled={historyQuery.isFetching}
          />
        </div>

        {historyQuery.isPending ? (
          <HistorySkeleton />
        ) : historyQuery.isError ? (
          <ErrorPanel
            description={getErrorMessage(
              historyQuery.error,
              "We couldn't load your attendance history."
            )}
            onRetry={() => void historyQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_1fr]">
            <AttendanceDonut
              summary={historyQuery.data.summary}
              monthName={monthLabel(month.year, month.month).split(" ")[0]!}
            />
            <div className="flex flex-col gap-4">
              <SummaryTiles summary={historyQuery.data.summary} />
              <HistoryTable
                records={historyQuery.data.records}
                todayIso={todayIso}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function HeroCard({
  isPending,
  isError,
  onRetry,
  record,
}: {
  isPending: boolean
  isError: boolean
  onRetry: () => void
  record: TeacherAttendanceRecord | null
}) {
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const [error, setError] = React.useState<string | null>(null)

  const checkedIn = record != null
  const checkedOut = record?.check_out_at != null
  const busy = checkIn.isPending || checkOut.isPending

  // Tick live while checked in but not yet out (clock + elapsed timer).
  const live = checkedIn && !checkedOut
  const now = useNow(live)

  const elapsed = checkedIn
    ? workedMs(record!.check_in_at, checkedOut ? record!.check_out_at : now)
    : null

  async function handleCheckIn() {
    setError(null)
    try {
      await checkIn.mutateAsync()
      toastSuccess("Checked in.", { id: "teacher-checkin" })
    } catch (err) {
      // Surface the API's reason verbatim (e.g. a blocked-network 403); never
      // mask it behind a generic message (`task-3.3`, Behavior).
      const message = getErrorMessage(err, "Couldn't check in.")
      setError(message)
      toastError(err, "Couldn't check in.", { id: "teacher-checkin" })
    }
  }

  async function handleCheckOut() {
    setError(null)
    try {
      await checkOut.mutateAsync()
      toastSuccess("Checked out.", { id: "teacher-checkin" })
    } catch (err) {
      const message = getErrorMessage(err, "Couldn't check out.")
      setError(message)
      toastError(err, "Couldn't check out.", { id: "teacher-checkin" })
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm">
      <div className="grid grid-cols-1 gap-7 p-6 sm:p-7 lg:grid-cols-[1fr_auto]">
        {/* Left — date, notice, facts */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <CalendarDays className="size-5 shrink-0 text-brand" aria-hidden />
            <span className="font-semibold text-copy-primary">
              Today · {formatDate(new Date().toISOString())}
            </span>
            {live ? (
              <span className="rounded-full bg-accent-dim px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-brand">
                {clockTime(now)}
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 flex items-center gap-2 text-sm text-copy-muted">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            Check-in is allowed only from your branch&apos;s approved network.
          </p>

          {isError ? (
            <div className="mt-6">
              <ErrorPanel
                description="We couldn't load today's status."
                onRetry={onRetry}
              />
            </div>
          ) : isPending ? (
            <div className="mt-6 flex gap-10">
              <Skeleton className="h-12 w-24 rounded-lg" />
              <Skeleton className="h-12 w-24 rounded-lg" />
              <Skeleton className="h-12 w-24 rounded-lg" />
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
              <HeroFact label="Status">
                {record ? (
                  <StatusBadge status={attendanceStatusLabel(record.status)} />
                ) : (
                  <span className="text-sm text-copy-secondary">
                    Not checked in
                  </span>
                )}
              </HeroFact>
              <HeroFact label="Check-in">
                <TimeValue value={record?.check_in_at} />
              </HeroFact>
              <HeroFact label="Check-out">
                <TimeValue value={record?.check_out_at} />
              </HeroFact>
            </div>
          )}

          {error ? (
            <div className="mt-5">
              <FormBanner message={error} />
            </div>
          ) : null}
        </div>

        {/* Right — timer panel */}
        <div className="flex flex-col items-start gap-3.5 border-t border-surface-border pt-6 lg:items-end lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0 lg:min-w-[280px]">
          {isPending ? (
            <Skeleton className="h-[120px] w-full rounded-xl" />
          ) : (
            <>
              <TimerLabel
                checkedIn={checkedIn}
                checkedOut={checkedOut}
                live={live}
              />
              <TimerValue ms={elapsed} placeholder={!checkedIn} />
              <p className="text-xs text-copy-muted">
                {!checkedIn
                  ? "Check in to start your day."
                  : checkedOut
                    ? "You have checked out for the day."
                    : "Time elapsed since check-in."}
              </p>

              {!checkedIn ? (
                <Button
                  onClick={handleCheckIn}
                  loading={busy}
                  className={ACTION_BTN}
                >
                  {!busy ? <LogIn className="size-4" aria-hidden /> : null}
                  Check in
                </Button>
              ) : checkedOut ? (
                <Button variant="outline" disabled className={ACTION_BTN}>
                  <CalendarCheck className="size-4" aria-hidden />
                  Checked out
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  loading={busy}
                  variant="outline"
                  className={cn(
                    ACTION_BTN,
                    "border-error/40 text-error hover:bg-error/10 hover:text-error"
                  )}
                >
                  {!busy ? <LogOut className="size-4" aria-hidden /> : null}
                  Check out
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function HeroFact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-copy-muted">
        {label}
      </span>
      {children}
    </div>
  )
}

function TimeValue({ value }: { value: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-copy-primary">
      <Clock className="size-4 text-copy-muted" aria-hidden />
      <span className="font-mono tabular-nums">
        {value ? formatTime(value) : EMPTY}
      </span>
    </span>
  )
}

function TimerLabel({
  checkedIn,
  checkedOut,
  live,
}: {
  checkedIn: boolean
  checkedOut: boolean
  live: boolean
}) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-success">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        Working now
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-copy-muted">
      {checkedOut ? "Total worked today" : checkedIn ? "Worked" : "Not checked in"}
    </span>
  )
}

function TimerValue({
  ms,
  placeholder,
}: {
  ms: number | null
  placeholder: boolean
}) {
  if (placeholder || ms == null) {
    return (
      <span className="font-mono text-5xl font-semibold leading-none tracking-tight text-copy-muted tabular-nums">
        00:00
        <span className="text-copy-muted/60">:00</span>
      </span>
    )
  }

  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  return (
    <span className="font-mono text-5xl font-semibold leading-none tracking-tight text-copy-primary tabular-nums">
      {pad(h)}:{pad(m)}
      <span className="text-copy-muted">:{pad(s)}</span>
    </span>
  )
}

/** `09:05:07 am` live clock for the today pill. */
function clockTime(now: Date): string {
  let h = now.getHours()
  const ap = h >= 12 ? "pm" : "am"
  h = h % 12 || 12
  return `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ap}`
}

function SummaryTiles({ summary }: { summary: TeacherAttendanceSummary }) {
  const tiles: { label: string; value: number; tone: StatusTone }[] = [
    { label: "Present", value: summary.present, tone: "success" },
    { label: "Late", value: summary.late, tone: "warning" },
    { label: "Absent", value: summary.absent, tone: "error" },
    { label: "Leave", value: summary.leave, tone: "info" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn(
            "flex flex-col gap-2 rounded-xl border p-4",
            TONE_TINT[tile.tone]
          )}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="size-2 rounded-full bg-current" aria-hidden />
            {tile.label}
          </span>
          <span className="font-mono text-3xl font-bold leading-none tabular-nums">
            {tile.value}
          </span>
          <span className="-mt-0.5 text-xs text-copy-muted">
            {tile.value === 1 ? "day" : "days"}
          </span>
        </div>
      ))}
    </div>
  )
}

function AttendanceDonut({
  summary,
  monthName,
}: {
  summary: TeacherAttendanceSummary
  monthName: string
}) {
  const segments: { label: string; value: number; tone: StatusTone }[] = [
    { label: "Present", value: summary.present, tone: "success" },
    { label: "Late", value: summary.late, tone: "warning" },
    { label: "Absent", value: summary.absent, tone: "error" },
    { label: "Leave", value: summary.leave, tone: "info" },
  ]
  const total = segments.reduce((a, b) => a + b.value, 0)
  const onTimePct = total === 0 ? 0 : Math.round((summary.present / total) * 100)

  // SVG donut geometry — matches the design's 200×200 / r78 / 20-stroke ring.
  const R = 78
  const C = 2 * Math.PI * R
  const GAP = 0.012 // fractional gap between arcs
  let offset = 0

  return (
    <section className="flex flex-col rounded-2xl border border-surface-border bg-surface p-6 shadow-sm">
      <h3 className="text-base font-bold tracking-tight text-copy-primary">
        Attendance rate
      </h3>
      <p className="mt-0.5 text-sm text-copy-muted">
        {total} working {total === 1 ? "day" : "days"} in {monthName}
      </p>

      <div className="relative mx-auto mt-4 size-[200px]">
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle
            cx={100}
            cy={100}
            r={R}
            fill="none"
            stroke="var(--bg-subtle)"
            strokeWidth={20}
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value === 0) return null
              const frac = seg.value / total
              const len = Math.max(0, frac - GAP) * C
              const rot = offset * 360 - 90
              offset += frac
              return (
                <circle
                  key={seg.label}
                  cx={100}
                  cy={100}
                  r={R}
                  fill="none"
                  stroke={TONE_STROKE[seg.tone]}
                  strokeWidth={20}
                  strokeLinecap="round"
                  strokeDasharray={`${len} ${C - len}`}
                  transform={`rotate(${rot} 100 100)`}
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold tabular-nums text-copy-primary">
            {onTimePct}%
          </span>
          <span className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-copy-muted">
            On time
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {segments.map((seg) => {
          const pct = total === 0 ? 0 : Math.round((seg.value / total) * 100)
          return (
            <div
              key={seg.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2.5 font-medium text-copy-primary">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: TONE_STROKE[seg.tone] }}
                  aria-hidden
                />
                {seg.label}
              </span>
              <span className="flex items-center gap-2 text-copy-muted">
                <span>{pct}%</span>
                <span className="font-mono font-semibold tabular-nums text-copy-primary">
                  {seg.value}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function HistoryTable({
  records,
  todayIso,
}: {
  records: TeacherAttendanceRecord[]
  todayIso: string
}) {
  // Today's row keeps a live "Worked" value while it's still open.
  const todayOpen = records.some(
    (r) => r.date === todayIso && r.check_in_at && !r.check_out_at
  )
  const now = useNow(todayOpen)

  if (records.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No records this month"
        description="No check-ins have been recorded for the selected month."
      />
    )
  }

  function workedCell(record: TeacherAttendanceRecord): React.ReactNode {
    if (!record.check_in_at) {
      return <span className="text-copy-muted">{EMPTY}</span>
    }
    if (!record.check_out_at) {
      // Open record — live for today, otherwise just dashes.
      if (record.date !== todayIso) {
        return <span className="text-copy-muted">{EMPTY}</span>
      }
      const ms = workedMs(record.check_in_at, now)
      return (
        <span className="font-mono font-semibold tabular-nums text-success">
          {ms == null ? EMPTY : formatWorkedShort(ms)}
        </span>
      )
    }
    const ms = workedMs(record.check_in_at, record.check_out_at)
    return (
      <span className="font-mono tabular-nums text-copy-secondary">
        {ms == null ? EMPTY : formatWorkedShort(ms)}
      </span>
    )
  }

  function checkOutCell(record: TeacherAttendanceRecord): React.ReactNode {
    if (record.check_out_at) {
      return (
        <span className="font-mono tabular-nums text-copy-secondary">
          {formatTime(record.check_out_at)}
        </span>
      )
    }
    if (record.check_in_at && record.date === todayIso) {
      return <StatusBadge status="Active" tone="success" />
    }
    return <span className="text-copy-muted">{EMPTY}</span>
  }

  return (
    <>
      {/* Table ≥ sm */}
      <div className="hidden overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Check-in</TableHead>
              <TableHead className="text-right">Check-out</TableHead>
              <TableHead className="text-right">Worked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-semibold text-copy-primary">
                  {formatDate(record.date)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={attendanceStatusLabel(record.status)} />
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-copy-secondary">
                  {record.check_in_at ? (
                    formatTime(record.check_in_at)
                  ) : (
                    <span className="text-copy-muted">{EMPTY}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {checkOutCell(record)}
                </TableCell>
                <TableCell className="text-right">{workedCell(record)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards < sm */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {records.map((record) => (
          <li
            key={record.id}
            className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-copy-primary">
                {formatDate(record.date)}
              </span>
              <StatusBadge status={attendanceStatusLabel(record.status)} />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <HeroFact label="Check-in">
                <TimeValue value={record.check_in_at} />
              </HeroFact>
              <HeroFact label="Check-out">
                {record.check_out_at ? (
                  <TimeValue value={record.check_out_at} />
                ) : record.check_in_at && record.date === todayIso ? (
                  <StatusBadge status="Active" tone="success" />
                ) : (
                  <span className="text-base text-copy-muted">{EMPTY}</span>
                )}
              </HeroFact>
              <HeroFact label="Worked">
                <span className="text-base">{workedCell(record)}</span>
              </HeroFact>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function HistorySkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_1fr]">
      <Skeleton className="h-[420px] rounded-2xl" />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  )
}

/** Re-exported so `statusTone` participates in the tonal status colouring. */
export type { AttendanceStatusValue }
void statusTone
