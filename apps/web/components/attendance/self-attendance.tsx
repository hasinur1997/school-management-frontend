"use client"

/**
 * Student self attendance (task 3.2): the signed-in student's own monthly sheet
 * via `GET /me/attendance`. The endpoint is intrinsically the student role — a
 * non-student gets 403, surfaced here as an access state.
 */

import * as React from "react"
import { Lock } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useMyMonthlyAttendance } from "@/hooks/attendance"
import { isForbiddenError } from "@/lib/api"
import { getErrorMessage } from "@/lib/toast"
import { currentMonth } from "@/lib/attendance/month"
import { MonthYearPicker } from "./month-year-picker"
import { MonthlySheetView } from "./monthly-sheet-view"

export function SelfAttendance() {
  const [period, setPeriod] = React.useState(currentMonth)
  const query = useMyMonthlyAttendance(period)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            My attendance
          </h1>
          <p className="text-sm text-copy-muted">Your monthly attendance record.</p>
        </div>
        <MonthYearPicker
          year={period.year}
          month={period.month}
          onChange={setPeriod}
          disabled={query.isFetching}
        />
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        isForbiddenError(query.error) ? (
          <EmptyState
            icon={Lock}
            title="No attendance record"
            description="Attendance self-view is available to student accounts only."
          />
        ) : (
          <ErrorPanel
            description={getErrorMessage(
              query.error,
              "We couldn't load your attendance."
            )}
            onRetry={query.refetch}
          />
        )
      ) : query.data ? (
        <MonthlySheetView data={query.data} />
      ) : null}
    </div>
  )
}
