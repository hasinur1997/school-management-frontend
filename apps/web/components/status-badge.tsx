import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"

/**
 * The four state tones from `ui-context.md` (Status Colors). These map onto the
 * state tokens, which never change across accents.
 */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-subtle text-copy-secondary border-surface-border",
}

/**
 * Domain status → tone mapping per the `ui-context.md` Status Colors table.
 * Keys are lowercased; unknown statuses fall back to a neutral tone instead of
 * crashing or rendering unstyled.
 */
const STATUS_TONE: Record<string, StatusTone> = {
  // success
  present: "success",
  paid: "success",
  active: "success",
  approved: "success",
  passed: "success",
  pass: "success",
  // warning
  late: "warning",
  pending: "warning",
  partial: "warning",
  // error
  absent: "error",
  unpaid: "error",
  inactive: "error",
  rejected: "error",
  failed: "error",
  fail: "error",
  // info
  leave: "info",
  tc: "info",
  info: "info",
  informational: "info",
}

export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status.trim().toLowerCase()] ?? "neutral"
}

export interface StatusBadgeProps
  extends React.ComponentProps<typeof Badge> {
  status: string
  /** Override the auto-derived tone when a status string is ambiguous. */
  tone?: StatusTone
  /** Display label; defaults to the raw status string. */
  label?: React.ReactNode
}

/**
 * Renders a domain status as a tonal `Badge`. Tone is derived from the status
 * via `statusTone`, or can be set explicitly.
 */
export function StatusBadge({
  status,
  tone,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  const resolved = tone ?? statusTone(status)

  return (
    <Badge
      variant="outline"
      data-tone={resolved}
      className={cn(
        "gap-1.5 px-2.5 py-0.5 font-semibold capitalize",
        TONE_CLASSES[resolved],
        className
      )}
      {...props}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {label ?? status}
    </Badge>
  )
}
