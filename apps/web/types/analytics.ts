/**
 * Reports dashboard contract types (imported "Reports" design). Six tabs —
 * Overview, Fees & Collections, Attendance, Exam Results, Admissions, Expenses
 * — each an SQL-aggregated payload from `GET /reports/analytics/{tab}` over one
 * shared filter (date window + academic session + class + payment status +
 * super-admin branch). Money is the API's fixed 2dp decimal string; rates and
 * counts are numbers the server computes — the client only renders them.
 */

/** The six report surfaces; each maps 1:1 to a `/reports/analytics/{tab}` URL. */
export type AnalyticsTab =
  | "overview"
  | "fees"
  | "attendance"
  | "exams"
  | "admissions"
  | "expenses"

/** The date-range presets shown in the filter bar. */
export type RangePreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_session"
  | "custom"

/** Payment-status buckets for the fees-scoped tabs. */
export type PaymentStatus = "all" | "paid" | "pending" | "overdue"

/**
 * The filter the UI drives every tab with. `from`/`to` are the resolved window
 * (computed from the preset). `sessionId`/`classId`/`branchId` are entity
 * public ids (or null); the API resolves them and forces branch scope for
 * non-super-admins.
 */
export interface AnalyticsQuery {
  from: string
  to: string
  sessionId?: string | null
  classId?: string | null
  paymentStatus?: PaymentStatus
  branchId?: string | null
}

/** The resolved filters every tab echoes back. */
export interface AnalyticsFiltersEcho {
  from: string
  to: string
  session: string | null
  class: string
  payment_status: string
  branch: string
}

/** A period-over-period delta on an Overview KPI. */
export interface KpiDelta {
  pct: number
  direction: "up" | "down" | "flat"
}

export interface KpiValue<T> {
  value: T
  delta: KpiDelta
}

// ── Overview ─────────────────────────────────────────────────────────────────

export interface OverviewReport {
  filters: AnalyticsFiltersEcho
  kpis: {
    collected: KpiValue<string>
    outstanding: KpiValue<string>
    attendance_rate: KpiValue<number>
    new_admissions: KpiValue<number>
  }
  fee_collection: { month: string; billed: string; collected: string }[]
  attendance_snapshot: { class: string; rate: number }[]
  teachers_today: { present: number; total: number }
  top_dues: {
    student: string
    class: string
    oldest_invoice: string
    months_due: number
    amount: string
  }[]
}

// ── Fees & Collections ───────────────────────────────────────────────────────

export interface FeesCollectionReport {
  filters: AnalyticsFiltersEcho
  totals: { billed: string; collected: string; overdue: string }
  by_class: {
    class: string
    billed: string
    collected: string
    due: string
    rate: number
  }[]
}

// ── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceMode = "students" | "teachers"

export interface AttendanceReport {
  filters: AnalyticsFiltersEcho
  mode: AttendanceMode
  by_month: { month: string; rate: number }[]
  rows: { name: string; rate: number; absent_days: number }[]
}

// ── Exam Results ─────────────────────────────────────────────────────────────

export interface ExamsReport {
  filters: AnalyticsFiltersEcho
  exams: { type: string; label: string }[]
  selected: string | null
  grade_distribution: { grade: string; count: number }[]
  class_performance: {
    class: string
    appeared: number
    passed: number
    avg_gpa: number
    pass_rate: number
  }[]
}

// ── Admissions ───────────────────────────────────────────────────────────────

export interface AdmissionsReport {
  filters: AnalyticsFiltersEcho
  kpis: {
    new_admissions: number
    total_enrolled: number
    transfers_out: number
  }
  by_month: { month: string; count: number }[]
  by_class: { class: string; enrolled: number; new: number }[]
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpensesReport {
  filters: AnalyticsFiltersEcho
  kpis: { spent: string; collected: string; net: string }
  by_category: { category: string; amount: string }[]
  recent: {
    voucher: string
    description: string
    category: string
    amount: string
  }[]
}

/** Tab labels for the underline tab strip. */
export const ANALYTICS_TAB_LABELS: Record<AnalyticsTab, string> = {
  overview: "Overview",
  fees: "Fees & Collections",
  attendance: "Attendance",
  exams: "Exam Results",
  admissions: "Admissions",
  expenses: "Expenses",
}

/** Labels for the date-range presets. */
export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_3_months: "Last 3 months",
  this_session: "This session",
  custom: "Custom range",
}

/** Labels for the payment-status buckets. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  all: "All statuses",
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
}

/** Format a `YYYY-MM-DD` as `5 Jul 2026` for the custom range label. */
function shortDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

/**
 * The lower-case human range label the design shows inside KPI labels and panel
 * subtitles — the preset name ("this month") or the custom span ("5 Jul 2026 –
 * 15 Jul 2026").
 */
export function rangeLabel(
  preset: RangePreset,
  from: string | null,
  to: string | null
): string {
  if (preset === "custom") {
    return from && to ? `${shortDay(from)} – ${shortDay(to)}` : "custom range"
  }
  return RANGE_PRESET_LABELS[preset].toLowerCase()
}
