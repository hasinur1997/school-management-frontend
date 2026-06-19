/**
 * Single app-wide date formatter (`ui-context.md`, Currency/Dates/Numbers).
 *
 * The API returns ISO-ish date strings (`YYYY-MM-DD` or full ISO timestamps).
 * We render them in a stable, locale-independent medium format and fall back to
 * the empty marker (never `Invalid Date`) when the value is absent or unparseable.
 */

import { EMPTY_VALUE } from "./number"

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

/** Format an API date string (`"2025-01-31"`) as `31 Jan 2025`. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE

  return DATE_FORMAT.format(date)
}

/**
 * Format an optional start/end pair as a range (`31 Jan 2025 – 20 Dec 2025`),
 * collapsing to a single bound when only one is present.
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const from = start ? formatDate(start) : null
  const to = end ? formatDate(end) : null

  if (from && to) return `${from} – ${to}`
  if (from) return `From ${from}`
  if (to) return `Until ${to}`
  return EMPTY_VALUE
}
