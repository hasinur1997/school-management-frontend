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
 * Convert a 2dp decimal money string (`"1500.00"`) to a signed integer count of
 * cents using only string operations, so no float rounding is applied. Returns
 * `null` for non-numeric input.
 */
function toCents(value: string | number): number | null {
  const raw = (typeof value === "number" ? String(value) : value).trim()
  if (!isNumericValue(raw)) return null
  const negative = raw.startsWith("-")
  const unsigned = negative ? raw.slice(1) : raw
  const [intPart = "0", decPart = ""] = unsigned.split(".")
  const cents = Number(intPart) * 100 + Number(decPart.slice(0, 2).padEnd(2, "0"))
  return negative ? -cents : cents
}

/**
 * Subtract one money value from another, returning a plain 2dp decimal string
 * (no currency) suitable for `formatMoney`. Operates on integer cents so no
 * float precision is lost — used for an invoice's outstanding balance
 * (`amount − paid_amount`). Non-numeric input falls back to the empty marker.
 */
export function subtractMoney(
  minuend: string | number,
  subtrahend: string | number
): string {
  const a = toCents(minuend)
  const b = toCents(subtrahend)
  if (a === null || b === null) return EMPTY_VALUE

  const diff = a - b
  const negative = diff < 0
  const abs = Math.abs(diff)
  const intPart = Math.floor(abs / 100)
  const decPart = String(abs % 100).padStart(2, "0")
  return `${negative ? "-" : ""}${intPart}.${decPart}`
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
