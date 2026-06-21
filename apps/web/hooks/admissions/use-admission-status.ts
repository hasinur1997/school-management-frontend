"use client"

/**
 * `useAdmissionStatus(applicationNo)` — reads `GET /public/admissions/{no}/status`,
 * the authoritative application/payment status (task 2.5). The payment flow
 * re-fetches this on return from SSLCommerz and **never** trusts the redirect
 * query params.
 *
 * Public/unauthenticated. Disabled until an `application_no` is known. Short
 * stale window so a fresh re-fetch after returning from the gateway reflects the
 * posted payment.
 */

import { useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { AdmissionStatus } from "@/types/admission"

export function useAdmissionStatus(applicationNo: string | null) {
  return useQuery({
    queryKey: queryKey("admissions", "status", { applicationNo: applicationNo ?? "" }),
    queryFn: () =>
      api.get<AdmissionStatus>(
        `/public/admissions/${encodeURIComponent(applicationNo as string)}/status`
      ),
    enabled: !!applicationNo,
    staleTime: STALE_TIME.SHORT,
  })
}
