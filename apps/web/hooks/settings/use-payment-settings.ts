"use client"

/**
 * Reads the **partial-payment** feature toggle the fees module respects when
 * recording a counter payment (task F-5.3; the toggle is owned by settings task
 * 6.4, `GET /settings`). Until 6.4 lands the exact contract, the value is read
 * **defensively** — across the candidate keys the settings payload may carry it
 * under — and defaults to `false` (partial disabled) whenever settings can't be
 * read (endpoint absent, or the session lacks settings access). Defaulting to
 * "off" is the safe choice: the dialog only ever offers partial entry when the
 * toggle is explicitly on, never on a guess.
 *
 * The API stays the source of truth for what a payment may settle — this only
 * decides whether the amount field is editable in the UI.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"

/** Candidate keys the settings payload may expose the toggle under. */
const PARTIAL_KEYS = [
  "allow_partial_payment",
  "allow_partial_payments",
  "partial_payment_enabled",
  "partial_payments_enabled",
  "partial_payments",
] as const

/** Read the partial-payment toggle from an unknown settings payload. */
function readAllowPartial(data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const record = data as Record<string, unknown>
  for (const key of PARTIAL_KEYS) {
    if (typeof record[key] === "boolean") return record[key] as boolean
  }
  return false
}

export interface AllowPartialPayment {
  /** Whether the fees UI may offer partial (less-than-outstanding) entry. */
  allowPartial: boolean
  /** True while the settings read is still in flight. */
  isLoading: boolean
}

/**
 * `useAllowPartialPayment(enabled)` — resolves the partial-payment toggle,
 * fetching `GET /settings` only when `enabled` (e.g. while the local-payment
 * dialog is open). A failed read resolves to `allowPartial: false`.
 */
export function useAllowPartialPayment(enabled = true): AllowPartialPayment {
  const query = useQuery({
    queryKey: queryKey("settings", "global"),
    queryFn: () => api.get<unknown>("/settings"),
    enabled,
    staleTime: STALE_TIME.REFERENCE,
    // A missing/forbidden settings endpoint should quietly disable partial, not
    // retry — the mutation path never depends on this succeeding.
    retry: false,
  })

  return {
    allowPartial: query.isSuccess ? readAllowPartial(query.data) : false,
    isLoading: query.isLoading,
  }
}
