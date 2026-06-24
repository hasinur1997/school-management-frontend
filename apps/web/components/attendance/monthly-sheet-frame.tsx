"use client"

/**
 * Layout frame for a monthly attendance sheet (task 3.2): a header row (title +
 * optional aside) with the month switcher, then the resolved view or the
 * loading / error / not-found / empty state. The three monthly surfaces
 * (per-student, self, parent-child) own their own month state + query and feed
 * the result in here, so the state handling lives in one place.
 */

import * as React from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { FileQuestion } from "lucide-react"
import { isNotFoundError } from "@/lib/api"
import { getErrorMessage } from "@/lib/toast"
import { MonthYearPicker } from "./month-year-picker"
import { MonthlySheetView } from "./monthly-sheet-view"
import type { MonthlyAttendance } from "@/types/attendance"

export interface MonthlySheetFrameProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Rendered to the right of the title (e.g. a back link or child selector). */
  aside?: React.ReactNode
  year: number
  month: number
  onMonthChange: (next: { year: number; month: number }) => void
  query: {
    data: MonthlyAttendance | undefined
    isPending: boolean
    isError: boolean
    error: unknown
    isFetching: boolean
    refetch: () => void
  }
  /** Copy for the not-found state when the API hides the record as 404. */
  notFoundTitle?: string
  notFoundDescription?: string
}

export function MonthlySheetFrame({
  title,
  subtitle,
  aside,
  year,
  month,
  onMonthChange,
  query,
  notFoundTitle = "Record not available",
  notFoundDescription = "This attendance record doesn't exist or you don't have access to it.",
}: MonthlySheetFrameProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-copy-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {aside}
          <MonthYearPicker
            year={year}
            month={month}
            onChange={onMonthChange}
            disabled={query.isFetching}
          />
        </div>
      </div>

      {query.isPending ? (
        <SheetSkeleton />
      ) : query.isError ? (
        isNotFoundError(query.error) ? (
          <EmptyState
            icon={FileQuestion}
            title={notFoundTitle}
            description={notFoundDescription}
          />
        ) : (
          <ErrorPanel
            description={getErrorMessage(
              query.error,
              "We couldn't load this attendance sheet."
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

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}
