/**
 * Maps the raw `GET /dashboard` response into the cards the screen renders.
 *
 * The dashboard must show **only** figures the API actually sent and must not
 * compute anything client-side (ticket 1.7). So this normaliser:
 *   - walks the response object's entries in order;
 *   - skips anything that is not a present scalar figure (null/objects/arrays);
 *   - looks each key up in a catalog for a human label, icon, and whether it is
 *     money or a count — falling back to a humanised label + inferred kind for
 *     keys the catalog doesn't know, so a new backend figure still renders.
 *
 * When the documented contract (`docs/api/settings.md`) lands, adjust the
 * catalog keys/labels to match; the renderer needs no changes.
 */

import {
  Banknote,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Landmark,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { isNumericValue } from "@/lib/format"

/** How a figure's value is displayed. */
export type FigureKind = "count" | "currency"

/** Display metadata for a known figure key. */
interface FigureMeta {
  label: string
  icon: LucideIcon
  kind: FigureKind
}

/** A figure ready to render as a summary card. */
export interface DashboardCard {
  key: string
  label: string
  icon: LucideIcon
  kind: FigureKind
  value: string | number
}

/**
 * Known figure keys → presentation. Several aliases point at the same meta so
 * minor backend naming differences still resolve to a labelled, correctly
 * formatted card. The example figures named in the ticket are all covered.
 */
const CATALOG: Record<string, FigureMeta> = {
  // Counts ------------------------------------------------------------------
  students_count: { label: "Students", icon: Users, kind: "count" },
  total_students: { label: "Students", icon: Users, kind: "count" },
  student_count: { label: "Students", icon: Users, kind: "count" },

  teachers_count: { label: "Teachers", icon: GraduationCap, kind: "count" },
  total_teachers: { label: "Teachers", icon: GraduationCap, kind: "count" },
  teacher_count: { label: "Teachers", icon: GraduationCap, kind: "count" },

  today_attendance: {
    label: "Today's Attendance",
    icon: CalendarCheck,
    kind: "count",
  },
  attendance_today: {
    label: "Today's Attendance",
    icon: CalendarCheck,
    kind: "count",
  },
  present_today: {
    label: "Present Today",
    icon: CalendarCheck,
    kind: "count",
  },

  pending_admissions: {
    label: "Pending Admissions",
    icon: ClipboardList,
    kind: "count",
  },
  admissions_pending: {
    label: "Pending Admissions",
    icon: ClipboardList,
    kind: "count",
  },

  // Money -------------------------------------------------------------------
  fee_collection: { label: "Fee Collection", icon: Wallet, kind: "currency" },
  fees_collected: { label: "Fee Collection", icon: Wallet, kind: "currency" },
  today_collection: {
    label: "Today's Collection",
    icon: Wallet,
    kind: "currency",
  },
  outstanding_fees: { label: "Outstanding Fees", icon: Receipt, kind: "currency" },
  outstanding: { label: "Outstanding", icon: Receipt, kind: "currency" },

  total_income: { label: "Income", icon: Banknote, kind: "currency" },
  income: { label: "Income", icon: Banknote, kind: "currency" },
  total_expense: { label: "Expenses", icon: Banknote, kind: "currency" },
  total_expenses: { label: "Expenses", icon: Banknote, kind: "currency" },
  expenses: { label: "Expenses", icon: Banknote, kind: "currency" },

  profit: { label: "Profit / Loss", icon: TrendingUp, kind: "currency" },
  profit_loss: { label: "Profit / Loss", icon: TrendingUp, kind: "currency" },
  net_profit: { label: "Profit / Loss", icon: TrendingUp, kind: "currency" },

  total_assets: { label: "Asset Value", icon: Landmark, kind: "currency" },
  asset_value: { label: "Asset Value", icon: Landmark, kind: "currency" },
}

/** Keys whose values are money even when the catalog doesn't list them. */
const MONEY_HINT = /(amount|fee|collection|income|expense|profit|loss|balance|revenue|due|value|asset|salary|payment)/i

/** Title-case a snake/camel/kebab key into a label, e.g. `pending_admissions`. */
function humanise(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Infer a figure's kind for keys the catalog doesn't know. */
function inferKind(key: string, value: string | number): FigureKind {
  if (MONEY_HINT.test(key)) return "currency"
  // Money arrives as a decimal string (`"45000.00"`); a bare integer is a count.
  if (typeof value === "string" && value.includes(".")) return "currency"
  return "count"
}

/**
 * Normalise the raw response into the ordered list of cards to render. Returns
 * `[]` when the response holds no usable figures, which drives the empty state.
 */
export function toDashboardCards(summary: unknown): DashboardCard[] {
  if (!summary || typeof summary !== "object") return []

  const cards: DashboardCard[] = []
  for (const [key, raw] of Object.entries(summary as Record<string, unknown>)) {
    // Render only present scalar figures — never assume a figure the API didn't
    // send, and never try to render nested objects/arrays as a card.
    if (raw === null || raw === undefined) continue
    if (typeof raw !== "string" && typeof raw !== "number") continue
    if (typeof raw === "string" && !isNumericValue(raw)) continue

    const meta = CATALOG[key]
    cards.push({
      key,
      label: meta?.label ?? humanise(key),
      icon: meta?.icon ?? TrendingUp,
      kind: meta?.kind ?? inferKind(key, raw),
      value: raw,
    })
  }
  return cards
}
