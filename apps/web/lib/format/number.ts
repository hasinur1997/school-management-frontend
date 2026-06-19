/**
 * Display formatters for money and counts (`code-standards.md`, UI Conventions;
 * `ui-context.md`, Currency/Numbers).
 *
 * Money is kept as the decimal string the API returns and is **never parsed
 * into a float for arithmetic** — grouping is done by string manipulation so no
 * precision is lost on large amounts. Counts are integers and may be grouped
 * with `Intl.NumberFormat`.
 */

/** Currency prefix; the app uses Bangladeshi Taka (`ui-context.md`). */
export const DEFAULT_CURRENCY = "৳"

/** Shown when a figure is absent/non-numeric so a card never renders blank. */
export const EMPTY_VALUE = "—"

/** True when a value is a finite number expressed as a number or decimal string. */
export function isNumericValue(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "string") return /^-?\d+(\.\d+)?$/.test(value.trim())
  return false
}

/**
 * Group an unsigned integer-digit string with thousands separators using only
 * string operations (no float math).
 */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/**
 * Format an API money value — a decimal string like `"45000.00"` (or a number)
 * — as a grouped currency string (`৳45,000.00`). Operates purely on the string
 * representation so no float rounding is ever applied to the amount.
 */
export function formatMoney(
  value: string | number | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  if (value === null || value === undefined) return EMPTY_VALUE

  const raw = (typeof value === "number" ? String(value) : value).trim()
  if (!isNumericValue(raw)) return EMPTY_VALUE

  const negative = raw.startsWith("-")
  const unsigned = negative ? raw.slice(1) : raw
  const [intPartRaw, decPartRaw = ""] = unsigned.split(".")
  const intDigits = (intPartRaw ?? "").replace(/\D/g, "") || "0"
  const decimals = decPartRaw.replace(/\D/g, "").slice(0, 2).padEnd(2, "0")

  return `${negative ? "-" : ""}${currency}${groupDigits(intDigits)}.${decimals}`
}

/**
 * Format a count for display with thousands grouping. Counts are integers, so
 * `Intl.NumberFormat` is safe here. Non-numeric input falls back to the empty
 * marker rather than `NaN`.
 */
export function formatCount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || !isNumericValue(value)) {
    return EMPTY_VALUE
  }
  const n = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat("en-US").format(n)
}
