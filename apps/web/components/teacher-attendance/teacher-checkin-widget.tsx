"use client"

/**
 * Teacher self check-in / check-out (task 3.3). One screen, two parts:
 *
 *  - **Today** — the teacher's status for today plus Check in / Check out
 *    buttons. IP validation is entirely server-side; this only triggers the
 *    call. On rejection (a blocked network → 403, or an already-done → 409) the
 *    API's reason is rendered verbatim in an inline banner, never masked
 *    (`task-3.3`, Behavior).
 *  - **History** — month-navigable summary + the month's records, read from
 *    `GET /me/teacher-attendance`.
 *
 * Today's record always reads the current month so it stays correct while the
 * history browses other months; the two share one query when the history is on
 * the current month.
 */

import * as React from "react"
import { CalendarCheck, Clock, LogIn, LogOut } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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

/** Background/border/text tint per status tone, reused by the summary tiles. */
const TONE_TINT: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-surface-border bg-subtle text-copy-secondary",
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
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          My attendance
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Check in and out for the day and review your history.
        </p>
      </div>

      <TodayCard
        isPending={todayQuery.isPending}
        isError={todayQuery.isError}
        onRetry={() => void todayQuery.refetch()}
        record={todayRecord}
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-copy-primary">
            History · {monthLabel(month.year, month.month)}
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
          <>
            <SummaryTiles summary={historyQuery.data.summary} />
            <HistoryTable records={historyQuery.data.records} />
          </>
        )}
      </section>
    </div>
  )
}

function TodayCard({
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-5 text-copy-muted" aria-hidden />
          Today · {formatDate(new Date().toISOString())}
        </CardTitle>
        <CardDescription>
          Check-in is allowed only from your branch&apos;s approved network.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError ? (
          <ErrorPanel
            description="We couldn't load today's status."
            onRetry={onRetry}
          />
        ) : isPending ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-copy-muted">
                  Status
                </span>
                {record ? (
                  <StatusBadge status={attendanceStatusLabel(record.status)} />
                ) : (
                  <span className="text-sm text-copy-secondary">
                    Not checked in
                  </span>
                )}
              </div>
              <TimeFact label="Check-in" value={record?.check_in_at} />
              <TimeFact label="Check-out" value={record?.check_out_at} />
            </div>

            <div className="flex shrink-0 gap-2">
              {!checkedIn ? (
                <Button onClick={handleCheckIn} loading={busy}>
                  {!busy ? <LogIn className="size-4" aria-hidden /> : null}
                  Check in
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  loading={busy}
                  disabled={checkedOut}
                  variant={checkedOut ? "outline" : "default"}
                >
                  {!busy ? <LogOut className="size-4" aria-hidden /> : null}
                  {checkedOut ? "Checked out" : "Check out"}
                </Button>
              )}
            </div>
          </div>
        )}

        <FormBanner message={error} />
      </CardContent>
    </Card>
  )
}

function TimeFact({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-copy-muted">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-copy-primary">
        <Clock className="size-3.5 text-copy-muted" aria-hidden />
        {value ? formatTime(value) : EMPTY}
      </span>
    </div>
  )
}

function SummaryTiles({ summary }: { summary: TeacherAttendanceSummary }) {
  const tiles: { label: string; value: number; tone: StatusTone }[] = [
    { label: "Present", value: summary.present, tone: "success" },
    { label: "Late", value: summary.late, tone: "warning" },
    { label: "Absent", value: summary.absent, tone: "error" },
    { label: "Leave", value: summary.leave, tone: "info" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

function HistoryTable({ records }: { records: TeacherAttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No records this month"
        description="No check-ins have been recorded for the selected month."
      />
    )
  }

  return (
    <>
      {/* Table ≥ sm */}
      <div className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium text-copy-primary">
                  {formatDate(record.date)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={attendanceStatusLabel(record.status)} />
                </TableCell>
                <TableCell className="tabular-nums text-copy-secondary">
                  {record.check_in_at ? formatTime(record.check_in_at) : EMPTY}
                </TableCell>
                <TableCell className="tabular-nums text-copy-secondary">
                  {record.check_out_at ? formatTime(record.check_out_at) : EMPTY}
                </TableCell>
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
            className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-copy-primary">
                {formatDate(record.date)}
              </span>
              <StatusBadge status={attendanceStatusLabel(record.status)} />
            </div>
            <div className="flex gap-6">
              <TimeFact label="Check-in" value={record.check_in_at} />
              <TimeFact label="Check-out" value={record.check_out_at} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

/** Re-exported so `statusTone` participates in the tonal status colouring. */
export type { AttendanceStatusValue }
void statusTone
