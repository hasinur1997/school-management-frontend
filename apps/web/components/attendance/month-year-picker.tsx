"use client"

/**
 * Month + year picker for the class monthly sheet (task 3.2) — the imported
 * "Monthly Attendance" design: prev/next arrows flanking a Month dropdown and a
 * Year dropdown, so a distant month is one click away instead of many. Future
 * months have no attendance, so Next (and any future month/year option) is
 * disabled — picking a year that would land in the future clamps the month back
 * to the current one.
 *
 * Shared by every attendance monthly surface: the class sheet and the
 * per-student / self / parent-child sheets (via `MonthlySheetFrame`).
 */

import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import {
  currentMonth,
  isCurrentOrFuture,
  monthLabel,
  nextMonth,
  previousMonth,
} from "@/lib/attendance/month"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/** How many past years the year dropdown offers (plus the current year). */
const YEAR_SPAN = 6

export interface MonthYearPickerProps {
  year: number
  month: number
  onChange: (next: { year: number; month: number }) => void
  disabled?: boolean
}

export function MonthYearPicker({
  year,
  month,
  onChange,
  disabled,
}: MonthYearPickerProps) {
  const now = currentMonth()
  const atLatest = isCurrentOrFuture(year, month)

  const years = Array.from(
    { length: YEAR_SPAN + 1 },
    (_, i) => now.year - (YEAR_SPAN - i)
  )

  function selectMonth(nextMonthValue: number) {
    onChange({ year, month: nextMonthValue })
  }

  function selectYear(nextYear: number) {
    // Picking the current year can't leave the month in the future.
    const clampedMonth =
      nextYear === now.year && month > now.month ? now.month : month
    onChange({ year: nextYear, month: clampedMonth })
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <span className="text-sm font-medium text-copy-primary">Month</span>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous month"
          disabled={disabled}
          onClick={() => onChange(previousMonth(year, month))}
          className="size-8"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>

        <Select
          value={String(month)}
          onValueChange={(value) => selectMonth(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-8 w-44 justify-between text-sm font-semibold"
            aria-label="Select month"
          >
            {/* Trigger shows the full "June 2026" (design); options are months. */}
            <span>{monthLabel(year, month)}</span>
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, index) => {
              const monthValue = index + 1
              const future = year === now.year && monthValue > now.month
              return (
                <SelectItem
                  key={monthValue}
                  value={String(monthValue)}
                  disabled={future}
                >
                  {name}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next month"
          disabled={disabled || atLatest}
          onClick={() => onChange(nextMonth(year, month))}
          className="size-8"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <span className="ml-1 text-sm font-medium text-copy-primary">Year</span>
      <Select
        value={String(year)}
        onValueChange={(value) => selectYear(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-8 w-24 justify-between text-sm font-semibold"
          aria-label="Select year"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
