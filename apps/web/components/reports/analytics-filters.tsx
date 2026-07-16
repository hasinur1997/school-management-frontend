"use client"

/**
 * Reports dashboard filter bar (imported "Reports" design): a white card of
 * inline `label + control` pairs — academic session, date-range preset (with a
 * custom from/to shown only for "Custom range"), class, and payment status —
 * plus a Reset. Fully controlled; the container owns the values and computes the
 * resolved window from the preset.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { DatePicker } from "@workspace/ui/components/date-picker"
import type { AcademicSession, SchoolClass } from "@/types/academic"
import {
  PAYMENT_STATUS_LABELS,
  RANGE_PRESET_LABELS,
  type PaymentStatus,
  type RangePreset,
} from "@/types/analytics"

/** Filter select trigger: compact, subtle fill, semibold — matches the design. */
const TRIGGER =
  "h-9 rounded-[10px] border-surface-border bg-subtle px-3 text-[13px] font-semibold"

const PRESETS: RangePreset[] = [
  "this_month",
  "last_month",
  "last_3_months",
  "this_session",
  "custom",
]

const PAYMENT_STATUSES: PaymentStatus[] = ["all", "paid", "pending", "overdue"]

/** Consolidated (all classes) sentinel for the class selector. */
export const ALL_CLASSES = "all"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold text-copy-secondary">{children}</span>
  )
}

export interface AnalyticsFiltersProps {
  sessions: AcademicSession[]
  sessionId: string | null
  onSessionChange: (value: string) => void
  preset: RangePreset
  onPresetChange: (value: RangePreset) => void
  from: string | null
  to: string | null
  onFromChange: (value: string | null) => void
  onToChange: (value: string | null) => void
  classes: SchoolClass[]
  classId: string
  onClassChange: (value: string) => void
  paymentStatus: PaymentStatus
  onPaymentStatusChange: (value: PaymentStatus) => void
  onReset: () => void
}

export function AnalyticsFilters({
  sessions,
  sessionId,
  onSessionChange,
  preset,
  onPresetChange,
  from,
  to,
  onFromChange,
  onToChange,
  classes,
  classId,
  onClassChange,
  paymentStatus,
  onPaymentStatusChange,
  onReset,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-surface-border-subtle bg-surface px-3.5 py-3 shadow-card">
      <label className="flex items-center gap-2">
        <FieldLabel>Session</FieldLabel>
        <Select
          value={sessionId ?? ""}
          onValueChange={(next) => next && onSessionChange(next)}
        >
          <SelectTrigger className={TRIGGER} aria-label="Session">
            <SelectValue placeholder="Session">
              {(v: string) =>
                sessions.find((s) => s.id === v)?.name ?? "Session"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex items-center gap-2">
        <FieldLabel>Date range</FieldLabel>
        <Select
          value={preset}
          onValueChange={(next) => onPresetChange(next as RangePreset)}
        >
          <SelectTrigger className={TRIGGER} aria-label="Date range">
            <SelectValue>
              {(v: string) => RANGE_PRESET_LABELS[v as RangePreset]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {RANGE_PRESET_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2">
            <FieldLabel>From</FieldLabel>
            <DatePicker
              value={from}
              onValueChange={(value) => onFromChange(value || null)}
              placeholder="From"
              className="w-[152px]"
            />
          </label>
          <label className="flex items-center gap-2">
            <FieldLabel>To</FieldLabel>
            <DatePicker
              value={to}
              onValueChange={(value) => onToChange(value || null)}
              placeholder="To"
              className="w-[152px]"
            />
          </label>
        </div>
      ) : null}

      <label className="flex items-center gap-2">
        <FieldLabel>Class</FieldLabel>
        <Select
          value={classId}
          onValueChange={(next) => onClassChange(next ?? ALL_CLASSES)}
        >
          <SelectTrigger className={TRIGGER} aria-label="Class">
            <SelectValue>
              {(v: string) =>
                v === ALL_CLASSES
                  ? "All classes"
                  : (classes.find((c) => c.id === v)?.name ?? v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex items-center gap-2">
        <FieldLabel>Payment status</FieldLabel>
        <Select
          value={paymentStatus}
          onValueChange={(next) => onPaymentStatusChange(next as PaymentStatus)}
        >
          <SelectTrigger className={TRIGGER} aria-label="Payment status">
            <SelectValue>
              {(v: string) => PAYMENT_STATUS_LABELS[v as PaymentStatus]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((p) => (
              <SelectItem key={p} value={p}>
                {PAYMENT_STATUS_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto h-[34px] rounded-[9px] px-3 text-[12.5px] font-semibold text-brand transition-colors hover:bg-accent-dim"
      >
        Reset
      </button>
    </div>
  )
}
