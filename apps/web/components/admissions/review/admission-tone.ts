/**
 * Admission status → badge tone + label for the review surface (task 2.6).
 *
 * The lifecycle has exactly three states (`App\Enums\AdmissionStatus`):
 * pending → warning, approved → success, rejected → error. Unknown values fall
 * back to neutral.
 */

import type { StatusTone } from "@/components/status-badge"

const STATUS_TONE: Record<string, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}

export function admissionStatusTone(status: string): StatusTone {
  return STATUS_TONE[status.trim().toLowerCase()] ?? "neutral"
}

/** Humanise the status for display (capitalised by the badge). */
export function admissionStatusLabel(status: string): string {
  return status.replace(/_/g, " ").trim()
}
