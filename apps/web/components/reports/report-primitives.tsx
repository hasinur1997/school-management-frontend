"use client"

/**
 * Shared building blocks for the report views (task F-6.3), styled to the
 * Reports design (`ui-context.md` §10): headline KPI cards, a titled panel that
 * wraps every chart/table, a horizontal meter list, and the loading/error gate.
 *
 * Every figure a user reads is the API's own value — money via `formatMoney`,
 * counts via `formatCount` — and nothing is summed client-side
 * (`code-standards.md`, Reports). The only client math here is chart geometry:
 * `ratios()` turns a set of magnitudes into 0–1 bar/meter fractions for layout,
 * never a displayed number.
 */

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { ErrorPanel } from "@/components/error-state"
import { CardGridSkeleton } from "@/components/skeletons"
import { formatCount, formatMoney } from "@/lib/format"

/** Right-aligned tabular figure cell class shared by every breakdown table. */
export const NUM_CELL = "text-right font-mono tabular-nums whitespace-nowrap"

/** Uppercase eyebrow used for table-header rows and column labels. */
export const EYEBROW =
  "text-[11.5px] font-semibold uppercase tracking-[0.07em] text-copy-muted"

// ── Chart geometry ───────────────────────────────────────────────────────────

/**
 * Parse an API decimal string / number to a float **for layout ratios only**.
 * The result never surfaces as a figure — it scales a bar height or meter width
 * — so ordinary float parsing is fine here (precision matters only for the
 * displayed string, which stays the API's `formatMoney` output).
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Map magnitudes to 0–1 fractions of the largest (0 when all are zero). */
export function ratios(values: number[]): number[] {
  const max = values.reduce((m, v) => (v > m ? v : m), 0)
  if (max <= 0) return values.map(() => 0)
  return values.map((v) => (v > 0 ? v / max : 0))
}

// ── KPI card ─────────────────────────────────────────────────────────────────

export type Tone = "default" | "positive" | "negative" | "accent" | "warning"

const TONE_TEXT: Record<Tone, string> = {
  default: "text-copy-primary",
  positive: "text-success",
  negative: "text-error",
  accent: "text-brand",
  warning: "text-warning",
}

export interface Delta {
  pct: number
  direction: "up" | "down" | "flat"
}

export interface KpiCardProps {
  label: string
  value: string | number
  kind: "currency" | "count" | "raw"
  tone?: Tone
  /** Optional period-over-period delta shown under the value (Overview). */
  delta?: Delta
}

/**
 * One headline figure — muted label over a large mono value, with an optional
 * "vs last period" delta (`ui-context.md` §10). Money and counts render in the
 * tabular face so a KPI row aligns.
 */
export function KpiCard({
  label,
  value,
  kind,
  tone = "default",
  delta,
}: KpiCardProps) {
  const display =
    kind === "currency"
      ? formatMoney(value)
      : kind === "count"
        ? formatCount(value)
        : String(value)

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border-subtle bg-surface px-[18px] py-4 shadow-card">
      <span className="truncate text-[12.5px] font-medium text-copy-secondary">
        {label}
      </span>
      <span
        className={cn(
          "truncate font-mono text-[23px] font-bold tabular-nums tracking-[-0.01em]",
          TONE_TEXT[tone]
        )}
        title={display}
      >
        {display}
      </span>
      {delta ? <DeltaLabel delta={delta} /> : null}
    </div>
  )
}

/** Directional delta: a coloured arrow + percent + muted "vs last period". */
export function DeltaLabel({ delta }: { delta: Delta }) {
  if (delta.direction === "flat") {
    return (
      <span className="text-xs font-medium text-copy-muted">
        No change<span className="ml-1 font-normal">vs last period</span>
      </span>
    )
  }
  const up = delta.direction === "up"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        up ? "text-success" : "text-error"
      )}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {delta.pct}%
      <span className="font-medium text-copy-muted">vs last month</span>
    </span>
  )
}

/** Responsive grid for a row of KPI cards. */
export function KpiGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3.5 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  )
}

// ── Panel (titled card) ──────────────────────────────────────────────────────

export interface PanelProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Padding around the body; drop it for a flush table. */
  flush?: boolean
}

/** A titled surface card wrapping a chart or table (`ui-context.md` §3.9/§10). */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  flush = false,
}: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-surface-border-subtle bg-surface shadow-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-[22px] pb-3 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] font-bold text-copy-primary">{title}</h2>
          {description ? (
            <p className="truncate text-[12.5px] text-copy-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn(!flush && "px-[22px] pb-5")}>{children}</div>
    </section>
  )
}

// ── Meter list ───────────────────────────────────────────────────────────────

export interface Meter {
  label: string
  /** Preformatted value string shown on the right (already `formatMoney`'d). */
  value: string
  /** 0–1 fill fraction (layout only). */
  ratio: number
  tone?: Tone
}

const TONE_FILL: Record<Tone, string> = {
  default: "bg-chart-bar",
  positive: "bg-success",
  negative: "bg-error",
  accent: "bg-chart-bar",
  warning: "bg-warning",
}

/** Vertical stack of label + value over a track/fill meter (`ui-context.md` §10). */
export function MeterList({ meters }: { meters: Meter[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {meters.map((m, i) => (
        <div key={`${m.label}-${i}`} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-copy-primary">
              {m.label}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono tabular-nums font-semibold",
                m.tone ? TONE_TEXT[m.tone] : "text-copy-secondary"
              )}
            >
              {m.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-chart-track">
            <div
              className={cn(
                "h-full rounded-full",
                TONE_FILL[m.tone ?? "default"]
              )}
              style={{ width: `${Math.round(m.ratio * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Inline empty note for a breakdown with no rows in the window. */
export function ReportEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-surface-border bg-surface px-6 py-8 text-center text-sm text-copy-muted">
      {message}
    </div>
  )
}

export interface ReportStateProps {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  children: React.ReactNode
}

/**
 * Gate a report's body on its query state: a card-grid skeleton while loading, a
 * recoverable error panel on failure, otherwise the figures.
 */
export function ReportState({
  isLoading,
  isError,
  onRetry,
  children,
}: ReportStateProps) {
  if (isLoading) {
    return <CardGridSkeleton count={4} />
  }
  if (isError) {
    return (
      <ErrorPanel
        onRetry={onRetry}
        title="Couldn't load this report"
        description="The report figures couldn't be fetched. Please try again."
      />
    )
  }
  return <>{children}</>
}

// ── Chips / segmented toggle ─────────────────────────────────────────────────

export interface ChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

/** A pill chip used for the exam selector and the attendance mode toggle. */
export function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[34px] rounded-full border px-[15px] text-[13px] font-semibold transition-colors",
        active
          ? "border-brand bg-accent-dim text-brand"
          : "border-surface-border bg-surface text-copy-secondary hover:text-copy-primary"
      )}
    >
      {children}
    </button>
  )
}

// ── Grade distribution bars ──────────────────────────────────────────────────

export interface GradeBar {
  grade: string
  count: number
  /** 0–1 fill fraction (layout only). */
  ratio: number
}

// Per-grade fill colours, matching the design exactly (best → worst).
const GRADE_COLOR: Record<string, string> = {
  "A+": "#15803d",
  A: "#22c55e",
  "A-": "#7c3aed",
  "A−": "#7c3aed",
  B: "#a78bfa",
  C: "#f97316",
  D: "#f59e0b",
  F: "#dc2626",
}

/** Horizontal grade bars: grade label + coloured track/fill + count (`ui-context.md` §10). */
export function GradeBars({ grades }: { grades: GradeBar[] }) {
  return (
    <div className="flex flex-col gap-3">
      {grades.map((g) => (
        <div key={g.grade} className="flex items-center gap-3">
          <span className="w-[34px] shrink-0 font-mono text-[13px] font-bold text-copy-primary">
            {g.grade}
          </span>
          <span className="h-[22px] flex-1 overflow-hidden rounded-md bg-chart-track">
            <span
              className="block h-full rounded-md"
              style={{
                width: `${Math.max(g.ratio * 100, 2)}%`,
                backgroundColor: GRADE_COLOR[g.grade] ?? "#7c3aed",
              }}
            />
          </span>
          <span className="w-11 shrink-0 text-right font-mono text-[12.5px] font-semibold text-copy-secondary">
            {formatCount(g.count)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Flush table wrapper ──────────────────────────────────────────────────────

/**
 * A table body flush inside a {@see Panel} (`flush`) — a top divider under the
 * panel title, then the shared design-system table.
 */
export function PanelTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-surface-border-subtle">{children}</div>
  )
}

// ── Formatters ───────────────────────────────────────────────────────────────

/** Render a `YYYY-MM` bucket as a short month label (`Jul`). */
export function formatMonthShort(month: string): string {
  const [year, m] = month.split("-")
  if (!year || !m) return month
  const date = new Date(Number(year), Number(m) - 1, 1)
  if (Number.isNaN(date.getTime())) return month
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date)
}

/** Render a `YYYY-MM` bucket as `Mon YYYY`. */
export function formatMonthLong(month: string): string {
  const [year, m] = month.split("-")
  if (!year || !m) return month
  const date = new Date(Number(year), Number(m) - 1, 1)
  if (Number.isNaN(date.getTime())) return month
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(date)
}

/** A status pill (months-due / pass-rate) tinted by tone. */
export function StatusPill({
  children,
  tone = "warning",
}: {
  children: React.ReactNode
  tone?: "success" | "warning" | "accent" | "neutral"
}) {
  const cls =
    tone === "success"
      ? "bg-success-soft border-success-border text-success"
      : tone === "accent"
        ? "bg-accent-dim border-accent-soft-border text-brand"
        : tone === "neutral"
          ? "bg-subtle border-surface-border-subtle text-copy-secondary"
          : "bg-warning-soft border-warning-border text-warning"
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        cls
      )}
    >
      {children}
    </span>
  )
}

export { formatMoney, formatCount }
