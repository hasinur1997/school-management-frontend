/**
 * Calendar helpers for the attendance monthly sheets (task 3.2). `month` is
 * 1-based (1 = January) everywhere here, matching the backend's month/year
 * query params, so callers never juggle JS's 0-based months.
 */

const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
})

/** The current month/year (1-based month). */
export function currentMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/** Days in a 1-based month (handles leap Februaries). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Weekday index (0 = Sunday) of the month's first day. */
export function firstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

/** Zero-padded ISO date string for a 1-based month and a day-of-month. */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Weekday index (0 = Sunday … 6 = Saturday) for a 1-based month/day. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

/** Weekend days for the school calendar (Friday & Saturday, BD convention). */
const WEEKEND_DAYS = new Set([5, 6])

/** True when a weekday index (0 = Sunday) falls on the school weekend. */
export function isWeekend(weekday: number): boolean {
  return WEEKEND_DAYS.has(weekday)
}

/** True when (year, month, day) is today's calendar date. */
export function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  )
}

/** Human label for a month, e.g. `June 2026`. */
export function monthLabel(year: number, month: number): string {
  return MONTH_FORMAT.format(new Date(year, month - 1, 1))
}

/** The month before the given one (1-based, wrapping the year). */
export function previousMonth(year: number, month: number): {
  year: number
  month: number
} {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
}

/** The month after the given one (1-based, wrapping the year). */
export function nextMonth(year: number, month: number): {
  year: number
  month: number
} {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }
}

/** True when (year, month) is the current calendar month or later. */
export function isCurrentOrFuture(year: number, month: number): boolean {
  const now = currentMonth()
  return year > now.year || (year === now.year && month >= now.month)
}
