"use client"

/**
 * Reads the branch-scoped **partial-payment** feature toggle the fees module
 * respects when recording a counter payment (task F-5.3 / settings 6.4). A
 * collector may not hold `setting.manage`, so an unreadable settings endpoint
 * still resolves to the safe default `false` rather than blocking the dialog.
 */

import { useSettings } from "./use-settings"

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
  const query = useSettings({
    enabled,
    // A missing/forbidden settings endpoint should quietly disable partial, not
    // retry — the mutation path never depends on this succeeding.
    retry: false,
  })

  return {
    allowPartial:
      query.isSuccess && query.data.branch.partial_payment_enabled === true,
    isLoading: query.isLoading,
  }
}
